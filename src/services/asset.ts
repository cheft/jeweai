import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { assets, tasks, folders } from '@/drizzle/schema';
import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { getPresignedUrl } from '$lib/s3';
import { nanoid } from 'nanoid';
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_TOKEN,
  R2_BUCKET,
  R2_PUBLIC_BUCKET,
} from "$env/static/private";

const R2_COVER_DOMAIN = 'https://pub-0f1ebbb2b0ed48f9a0dbe8a44a832060.r2.dev';

// Helper to get Content-Type from file extension
function getContentTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper to delete R2 object using Cloudflare API
async function deleteR2Object(bucket: string, key: string) {
  const safeKey = key.startsWith('/') ? key.slice(1) : key;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${bucket}/objects/${safeKey}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_R2_TOKEN}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[R2] Delete failed: ${res.status} ${errorText}`);
      // Don't throw - file might not exist, which is fine
      return false;
    }

    console.log(`[R2] Successfully deleted ${bucket}/${safeKey}`);
    return true;
  } catch (err) {
    console.error(`[R2] Delete failed for ${bucket}/${safeKey}:`, err);
    return false;
  }
}

// Helper to copy R2 object using Cloudflare API
// Since X-Copy-Source might not work, we download and re-upload
async function copyR2Object(srcBucket: string, srcKey: string, destBucket: string, destKey: string, contentType?: string) {
  const safeSrcKey = srcKey.startsWith('/') ? srcKey.slice(1) : srcKey;
  const safeDestKey = destKey.startsWith('/') ? destKey.slice(1) : destKey;

  try {
    // Step 1: Download source file
    const getUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${srcBucket}/objects/${safeSrcKey}`;
    const getRes = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_R2_TOKEN}`,
      },
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.error(`[R2] Failed to download source file: ${getRes.status} ${errorText}`);
      throw new Error(`Failed to download source file: ${getRes.status}`);
    }

    // Get Content-Type from response or use provided/default
    const sourceContentType = contentType || getRes.headers.get('Content-Type') || getContentTypeFromExtension(safeSrcKey);
    const fileData = await getRes.arrayBuffer();

    console.log(`[R2] Downloaded ${fileData.byteLength} bytes from ${srcBucket}/${safeSrcKey}`);

    // Step 2: Upload to destination
    const putUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${destBucket}/objects/${safeDestKey}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_R2_TOKEN}`,
        'Content-Type': sourceContentType,
      },
      body: fileData,
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      console.error(`[R2] Failed to upload copied file: ${putRes.status} ${errorText}`);
      throw new Error(`Failed to upload copied file: ${putRes.status}`);
    }

    console.log(`[R2] Successfully copied ${srcBucket}/${safeSrcKey} to ${destBucket}/${safeDestKey} (${fileData.byteLength} bytes, Content-Type: ${sourceContentType})`);
    return safeDestKey;
  } catch (err) {
    console.error(`[R2] Copy failed for ${srcBucket}/${safeSrcKey}:`, err);
    throw err;
  }
}

export const list = os
  .input(
    z.object({
      folderId: z.string().nullable().optional(),
      includeFolders: z.boolean().optional().default(false),
    }).optional()
  )
  .handler(async ({ input, context }: { input?: { folderId?: string | null, includeFolders?: boolean }, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const folderId = input?.folderId ?? null;
    const includeFolders = input?.includeFolders ?? false;

    // Build where condition for folderId
    const folderCondition = folderId === null
      ? isNull(assets.folderId)
      : eq(assets.folderId, folderId);

    // Fetch assets from database
    const allAssets = await db.select()
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          folderCondition
        )
      )
      .orderBy(desc(assets.createdAt));

    // Fetch folders if needed
    let folderList: any[] = [];
    if (includeFolders) {
      const parentCondition = folderId === null
        ? isNull(folders.parentId)
        : eq(folders.parentId, folderId);

      folderList = await db.select()
        .from(folders)
        .where(
          and(
            eq(folders.userId, userId),
            parentCondition
          )
        )
        .orderBy(desc(folders.createdAt));
    }

    console.log(`[Asset List] Found ${allAssets.length} assets, ${folderList.length} folders for userId=${userId}, folderId=${folderId}`);

    // Build cover URLs for preview
    const assetResults = allAssets.map((asset) => {
      let coverUrl: string | null = null;
      if (asset.coverPath) {
        const cleanCoverPath = asset.coverPath.startsWith('/') ? asset.coverPath.slice(1) : asset.coverPath;
        coverUrl = `${R2_COVER_DOMAIN}/${cleanCoverPath}`;
      }

      let createdAt: number;
      let updatedAt: number;

      if (asset.createdAt instanceof Date) {
        createdAt = asset.createdAt.getTime();
      } else if (typeof asset.createdAt === 'number') {
        createdAt = asset.createdAt > 1000000000000 ? asset.createdAt : asset.createdAt * 1000;
      } else {
        createdAt = Date.now();
      }

      if (asset.updatedAt instanceof Date) {
        updatedAt = asset.updatedAt.getTime();
      } else if (typeof asset.updatedAt === 'number') {
        updatedAt = asset.updatedAt > 1000000000000 ? asset.updatedAt : asset.updatedAt * 1000;
      } else {
        updatedAt = Date.now();
      }

      return {
        id: asset.id,
        folderId: asset.folderId,
        name: asset.name,
        type: asset.type as 'image' | 'video',
        status: asset.status as 'locked' | 'unlocked',
        coverPath: asset.coverPath,
        coverUrl,
        path: asset.path,
        width: asset.width,
        height: asset.height,
        aspectRatio: asset.aspectRatio || null,
        createdAt,
        updatedAt,
      };
    });

    // Add folders to result if requested
    const folderResults = folderList.map((folder) => ({
      id: folder.id,
      folderId: folder.parentId,
      parentId: folder.parentId,
      name: folder.name,
      type: 'folder' as const,
      status: 'unlocked' as const,
      createdAt: folder.createdAt ? new Date(folder.createdAt).getTime() : Date.now(),
      updatedAt: folder.updatedAt ? new Date(folder.updatedAt).getTime() : Date.now(),
    }));

    return includeFolders ? [...folderResults, ...assetResults] : assetResults;
  });

export const get = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: { id: string }, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    // Fetch asset by ID
    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    // Find task related to this asset
    const [relatedTask] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.resultAssetId, input.id)
        )
      )
      .limit(1);

    let taskRelation = relatedTask;
    if (!taskRelation) {
      const [refTask] = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.referenceAssetId, input.id)
          )
        )
        .limit(1);
      taskRelation = refTask;
    }

    let videoUrl: string | null = null;
    let originalImageUrl: string | null = null;
    let coverUrl: string | null = null;

    if (asset.coverPath) {
      const cleanCoverPath = asset.coverPath.startsWith('/') ? asset.coverPath.slice(1) : asset.coverPath;
      coverUrl = `${R2_COVER_DOMAIN}/${cleanCoverPath}`;
    }

    if (asset.type === 'video' && asset.path) {
      videoUrl = await getPresignedUrl(asset.path);
    } else if (asset.type === 'image' && asset.path) {
      originalImageUrl = await getPresignedUrl(asset.path);
    }

    let referenceAsset: any = null;
    if (taskRelation && taskRelation.referenceAssetId && taskRelation.referenceAssetId !== asset.id) {
      const [refAsset] = await db.select()
        .from(assets)
        .where(eq(assets.id, taskRelation.referenceAssetId))
        .limit(1);
      if (refAsset) {
        const cleanRefCoverPath = refAsset.coverPath?.startsWith('/') ? refAsset.coverPath.slice(1) : refAsset.coverPath;
        referenceAsset = {
          id: refAsset.id,
          coverUrl: cleanRefCoverPath ? `${R2_COVER_DOMAIN}/${cleanRefCoverPath}` : null,
          originalUrl: refAsset.path ? await getPresignedUrl(refAsset.path) : null,
        };
      }
    }

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      coverUrl,
      videoUrl,
      originalImageUrl,
      width: asset.width || null,
      height: asset.height || null,
      aspectRatio: asset.aspectRatio || null,
      prompt: taskRelation?.prompt || asset.prompt || null,
      taskId: taskRelation?.id || null,
      taskStatus: taskRelation?.status || null,
      updatedAt: asset.updatedAt,
      createdAt: asset.createdAt,
      referenceAsset,
      model: 'SekoMotion v2.0',
    };
  });

export const update = os
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      folderId: z.string().nullable().optional(),
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    if (asset.status === 'locked') {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot modify locked asset' });
    }

    const targetFolderId = input.folderId !== undefined ? input.folderId : asset.folderId;
    const targetName = input.name !== undefined ? input.name : asset.name;

    if (input.name !== undefined || input.folderId !== undefined) {
      if (targetName !== asset.name || targetFolderId !== asset.folderId) {
        const folderCondition = targetFolderId === null
          ? isNull(assets.folderId)
          : eq(assets.folderId, targetFolderId);

        const conflictCheck = await db.select()
          .from(assets)
          .where(
            and(
              eq(assets.userId, userId),
              folderCondition,
              eq(assets.name, targetName)
            )
          );

        const conflicts = conflictCheck.filter(a => a.id !== input.id);
        if (conflicts.length > 0) {
          throw new ORPCError('BAD_REQUEST', { message: 'An asset with this name already exists in this directory' });
        }
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.folderId !== undefined) {
      updateData.folderId = input.folderId;
    }

    await db.update(assets)
      .set(updateData)
      .where(eq(assets.id, input.id));

    return { success: true };
  });

export const copy = os
  .input(z.object({ id: z.string(), folderId: z.string().nullable().optional() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [sourceAsset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!sourceAsset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    const newId = nanoid();
    const newFolderId = input.folderId !== undefined ? input.folderId : sourceAsset.folderId;

    let newPath = sourceAsset.path;
    let newCoverPath: string | null = sourceAsset.coverPath;

    if (sourceAsset.path) {
      const ext = sourceAsset.path.split('.').pop() || '';
      const newPathKey = `${userId}/${newId}.${ext}`;
      try {
        await copyR2Object(
          R2_BUCKET || 'jeweai',
          sourceAsset.path,
          R2_BUCKET || 'jeweai',
          newPathKey,
          sourceAsset.mimeType || undefined
        );
        newPath = newPathKey;
      } catch (err) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: `Failed to copy file: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
      }
    }

    if (sourceAsset.coverPath) {
      const ext = sourceAsset.coverPath.split('.').pop() || 'png';
      const newCoverKey = `${userId}/${newId}_cover.${ext}`;
      try {
        await copyR2Object(
          R2_PUBLIC_BUCKET || 'covers',
          sourceAsset.coverPath,
          R2_PUBLIC_BUCKET || 'covers',
          newCoverKey
        );
        newCoverPath = newCoverKey;
      } catch (err) {
        newCoverPath = sourceAsset.coverPath;
      }
    }

    let newName = sourceAsset.name || 'asset';
    const lastDotIndex = newName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const nameWithoutExt = newName.substring(0, lastDotIndex);
      const ext = newName.substring(lastDotIndex);
      newName = `${nameWithoutExt} copy${ext}`;
    } else {
      newName = `${newName} copy`;
    }

    const [newAsset] = await db.insert(assets).values({
      id: newId,
      userId,
      folderId: newFolderId,
      name: newName,
      type: sourceAsset.type,
      source: sourceAsset.source,
      fromAssetId: sourceAsset.fromAssetId,
      coverPath: newCoverPath,
      path: newPath,
      size: sourceAsset.size,
      mimeType: sourceAsset.mimeType,
      width: sourceAsset.width,
      height: sourceAsset.height,
      aspectRatio: sourceAsset.aspectRatio,
      duration: sourceAsset.duration,
      prompt: sourceAsset.prompt,
      metadata: sourceAsset.metadata,
      status: 'unlocked',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return { success: true, id: newAsset.id };
  });

export const deleteAsset = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    if (asset.status === 'locked') {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot delete locked asset' });
    }

    if (asset.path) {
      await deleteR2Object(R2_BUCKET || 'jeweai', asset.path);
    }

    if (asset.coverPath) {
      await deleteR2Object(R2_PUBLIC_BUCKET || 'covers', asset.coverPath);
    }

    await db.delete(assets)
      .where(eq(assets.id, input.id));

    return { success: true };
  });

// Folder operations
export const createFolder = os
  .input(z.object({ name: z.string(), parentId: z.string().nullable().optional() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const parentId = input.parentId || null;
    const parentCondition = parentId === null
      ? isNull(folders.parentId)
      : eq(folders.parentId, parentId);

    const existingFolders = await db.select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentCondition,
          eq(folders.name, input.name)
        )
      )
      .limit(1);

    if (existingFolders.length > 0) {
      throw new ORPCError('BAD_REQUEST', { message: 'A folder with this name already exists in this directory' });
    }

    const [newFolder] = await db.insert(folders).values({
      id: nanoid(),
      userId,
      name: input.name,
      parentId: parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return { success: true, id: newFolder.id };
  });

export const updateFolder = os
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      parentId: z.string().nullable().optional(),
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [folder] = await db.select()
      .from(folders)
      .where(and(eq(folders.id, input.id), eq(folders.userId, userId)))
      .limit(1);

    if (!folder) {
      throw new ORPCError('NOT_FOUND', { message: 'Folder not found' });
    }

    const targetParentId = input.parentId !== undefined ? input.parentId : folder.parentId;
    const targetName = input.name !== undefined ? input.name : folder.name;

    if (input.name !== undefined || input.parentId !== undefined) {
      if (targetName !== folder.name || targetParentId !== folder.parentId) {
        const parentCondition = targetParentId === null
          ? isNull(folders.parentId)
          : eq(folders.parentId, targetParentId);

        const conflictCheck = await db.select()
          .from(folders)
          .where(
            and(
              eq(folders.userId, userId),
              parentCondition,
              eq(folders.name, targetName)
            )
          );

        const conflicts = conflictCheck.filter(f => f.id !== input.id);
        if (conflicts.length > 0) {
          throw new ORPCError('BAD_REQUEST', { message: 'A folder with this name already exists in this directory' });
        }
      }
    }

    if (input.parentId) {
      let check: string | null = input.parentId;
      while (check) {
        if (check === input.id) {
          throw new ORPCError('BAD_REQUEST', { message: 'Cannot move folder into itself' });
        }
        const [parent] = await db.select()
          .from(folders)
          .where(eq(folders.id, check))
          .limit(1);
        check = parent?.parentId || null;
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.parentId !== undefined) {
      updateData.parentId = input.parentId;
    }

    await db.update(folders)
      .set(updateData)
      .where(eq(folders.id, input.id));

    return { success: true };
  });

export const deleteFolder = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [folder] = await db.select()
      .from(folders)
      .where(and(eq(folders.id, input.id), eq(folders.userId, userId)))
      .limit(1);

    if (!folder) {
      throw new ORPCError('NOT_FOUND', { message: 'Folder not found' });
    }

    async function deleteFolderRecursive(folderId: string, newParentId: string | null) {
      await db.update(assets)
        .set({ folderId: newParentId, updatedAt: new Date() })
        .where(eq(assets.folderId, folderId));

      const childFolders = await db.select()
        .from(folders)
        .where(eq(folders.parentId, folderId));

      for (const child of childFolders) {
        await deleteFolderRecursive(child.id, newParentId);
      }

      await db.delete(folders)
        .where(eq(folders.id, folderId));
    }

    await deleteFolderRecursive(input.id, folder.parentId);

    return { success: true };
  });

export const getFolder = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const [folder] = await db.select()
      .from(folders)
      .where(and(eq(folders.id, input.id), eq(folders.userId, userId)))
      .limit(1);

    if (!folder) {
      throw new ORPCError('NOT_FOUND', { message: 'Folder not found' });
    }

    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      type: 'folder' as const,
      createdAt: folder.createdAt ? new Date(folder.createdAt).getTime() : Date.now(),
      updatedAt: folder.updatedAt ? new Date(folder.updatedAt).getTime() : Date.now(),
    };
  });

export const listFolders = os
  .input(
    z.object({
      parentId: z.string().nullable().optional(),
    }).optional()
  )
  .handler(async ({ input, context }: { input?: { parentId?: string | null }, context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const parentId = input?.parentId ?? null;
    const parentCondition = parentId === null
      ? isNull(folders.parentId)
      : eq(folders.parentId, parentId);

    const allFolders = await db.select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentCondition
        )
      )
      .orderBy(desc(folders.createdAt));

    return allFolders.map((folder) => ({
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      type: 'folder' as const,
      createdAt: folder.createdAt ? new Date(folder.createdAt).getTime() : Date.now(),
      updatedAt: folder.updatedAt ? new Date(folder.updatedAt).getTime() : Date.now(),
    }));
  });
