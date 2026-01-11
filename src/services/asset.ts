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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    const folderId = input?.folderId ?? null;
    const includeFolders = input?.includeFolders ?? false;

    // Build where condition for folderId
    // Use isNull() for null checks, not eq(column, null)
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
        // Ensure coverPath doesn't start with / and build URL correctly
        const cleanCoverPath = asset.coverPath.startsWith('/') ? asset.coverPath.slice(1) : asset.coverPath;
        coverUrl = `${R2_COVER_DOMAIN}/${cleanCoverPath}`;
      }

      // Handle timestamp conversion - D1 stores as integer (unix timestamp in seconds or milliseconds)
      let createdAt: number;
      let updatedAt: number;
      
      if (asset.createdAt instanceof Date) {
        createdAt = asset.createdAt.getTime();
      } else if (typeof asset.createdAt === 'number') {
        // If it's already a timestamp, check if it's in seconds or milliseconds
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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Fetch asset by ID
    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    // Find task related to this asset (as reference or result)
    const [relatedTask] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          // Either this asset is the reference or the result
          // Using a simple OR logic: referenceAssetId = input.id OR resultAssetId = input.id
          // Drizzle doesn't have direct OR in `and()`, so we do two queries or use sql
          // For simplicity, let's check resultAssetId first (video asset)
          eq(tasks.resultAssetId, input.id)
        )
      )
      .limit(1);

    let taskRelation = relatedTask;
    if (!taskRelation) {
      // Check if this asset is a reference asset
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

    // Determine URLs
    // 1. If asset is a video (type === 'video'), its `path` is in the private `jeweai` bucket.
    //    Generate a presigned URL.
    // 2. `coverPath` is always in the public `covers` bucket.
    // 3. For the original image (if asset type is 'image'), `path` is in `jeweai` (private).

    let videoUrl: string | null = null;
    let originalImageUrl: string | null = null;
    let coverUrl: string | null = null;

    if (asset.coverPath) {
      // Ensure coverPath doesn't start with / and build URL correctly
      const cleanCoverPath = asset.coverPath.startsWith('/') ? asset.coverPath.slice(1) : asset.coverPath;
      coverUrl = `${R2_COVER_DOMAIN}/${cleanCoverPath}`;
    }

    if (asset.type === 'video' && asset.path) {
      // Video file is private, generate presigned URL
      videoUrl = await getPresignedUrl(asset.path);
    } else if (asset.type === 'image' && asset.path) {
      // Original image file is private, generate presigned URL
      originalImageUrl = await getPresignedUrl(asset.path);
    }

    // Get reference asset details if this is a video asset
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
      prompt: taskRelation?.prompt || asset.prompt || null,
      taskId: taskRelation?.id || null,
      taskStatus: taskRelation?.status || null,
      updatedAt: asset.updatedAt,
      createdAt: asset.createdAt,
      referenceAsset,
      model: 'SekoMotion v2.0', // Placeholder
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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Check if asset exists and belongs to user
    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    // Check if asset is locked
    if (asset.status === 'locked') {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot modify locked asset' });
    }

    // Determine target folder (use new folderId if provided, otherwise keep current)
    const targetFolderId = input.folderId !== undefined ? input.folderId : asset.folderId;
    const targetName = input.name !== undefined ? input.name : asset.name;

    // Check for name conflict in the target directory (only if name or folderId is changing)
    if (input.name !== undefined || input.folderId !== undefined) {
      // Only check if name actually changed
      if (targetName !== asset.name || targetFolderId !== asset.folderId) {
        const folderCondition = targetFolderId === null 
          ? isNull(assets.folderId)
          : eq(assets.folderId, targetFolderId);

        // Check for conflicts, excluding current asset
        const conflictCheck = await db.select()
          .from(assets)
          .where(
            and(
              eq(assets.userId, userId),
              folderCondition,
              eq(assets.name, targetName)
            )
          );

        // Filter out current asset manually
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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Get source asset
    const [sourceAsset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!sourceAsset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    // Copy is allowed even for locked assets (read-only operation)
    const newId = nanoid();
    const newFolderId = input.folderId !== undefined ? input.folderId : sourceAsset.folderId;

    // Copy R2 files if they exist
    let newPath = sourceAsset.path;
    let newCoverPath: string | null = sourceAsset.coverPath; // Default to original if copy fails

    if (sourceAsset.path) {
      // Copy original file in jeweai bucket
      const ext = sourceAsset.path.split('.').pop() || '';
      const newPathKey = `userid123456/${newId}.${ext}`;
      try {
        // Pass mimeType if available, otherwise it will be inferred from extension
        await copyR2Object(
          R2_BUCKET || 'jeweai', 
          sourceAsset.path, 
          R2_BUCKET || 'jeweai', 
          newPathKey,
          sourceAsset.mimeType || undefined
        );
        newPath = newPathKey;
        console.log(`[Asset Copy] Successfully copied file to ${newPathKey}`);
      } catch (err) {
        console.error(`[Asset Copy] Failed to copy file ${sourceAsset.path}:`, err);
        // If copy fails, we should still create the asset but without the file
        // Or we could throw an error - let's throw to ensure data consistency
        throw new ORPCError('INTERNAL_SERVER_ERROR', { 
          message: `Failed to copy file: ${err instanceof Error ? err.message : 'Unknown error'}` 
        });
      }
    }

    if (sourceAsset.coverPath) {
      // Copy cover file in covers bucket
      const ext = sourceAsset.coverPath.split('.').pop() || 'png';
      const newCoverKey = `userid123456/${newId}_cover.${ext}`;
      try {
        // Cover files are usually images, infer from extension
        await copyR2Object(
          R2_PUBLIC_BUCKET || 'covers', 
          sourceAsset.coverPath, 
          R2_PUBLIC_BUCKET || 'covers', 
          newCoverKey
        );
        newCoverPath = newCoverKey;
        console.log(`[Asset Copy] Successfully copied cover to ${newCoverKey}`);
      } catch (err) {
        console.error(`[Asset Copy] Failed to copy cover ${sourceAsset.coverPath}:`, err);
        // If cover copy fails, use original coverPath (shared file)
        // This ensures preview still works
        console.warn(`[Asset Copy] Using original coverPath ${sourceAsset.coverPath} for asset ${newId}`);
        newCoverPath = sourceAsset.coverPath;
      }
    }

    console.log(`[Asset Copy] Final paths - path: ${newPath}, coverPath: ${newCoverPath}`);

    // Generate new name with "copy" before file extension
    let newName = sourceAsset.name || 'asset';
    const lastDotIndex = newName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      // Has extension: insert " copy" before the extension
      const nameWithoutExt = newName.substring(0, lastDotIndex);
      const ext = newName.substring(lastDotIndex);
      newName = `${nameWithoutExt} copy${ext}`;
    } else {
      // No extension: append " copy"
      newName = `${newName} copy`;
    }

    // Create new asset record
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
      duration: sourceAsset.duration,
      prompt: sourceAsset.prompt,
      metadata: sourceAsset.metadata,
      status: 'unlocked', // Copied assets are always unlocked
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return { success: true, id: newAsset.id };
  });

export const deleteAsset = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Check if asset exists and belongs to user
    const [asset] = await db.select()
      .from(assets)
      .where(and(eq(assets.id, input.id), eq(assets.userId, userId)))
      .limit(1);

    if (!asset) {
      throw new ORPCError('NOT_FOUND', { message: 'Asset not found' });
    }

    // Check if asset is locked
    if (asset.status === 'locked') {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot delete locked asset' });
    }

    // Delete R2 files before deleting database record
    if (asset.path) {
      // Delete original file from jeweai bucket
      await deleteR2Object(R2_BUCKET || 'jeweai', asset.path);
    }

    if (asset.coverPath) {
      // Delete cover file from covers bucket
      await deleteR2Object(R2_PUBLIC_BUCKET || 'covers', asset.coverPath);
    }

    // Delete database record
    await db.delete(assets)
      .where(eq(assets.id, input.id));

    console.log(`[Asset Delete] Deleted asset ${input.id} and associated R2 files`);
    return { success: true };
  });

// Folder operations
export const createFolder = os
  .input(z.object({ name: z.string(), parentId: z.string().nullable().optional() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Check for name conflict in the same directory
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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Check if folder exists and belongs to user
    const [folder] = await db.select()
      .from(folders)
      .where(and(eq(folders.id, input.id), eq(folders.userId, userId)))
      .limit(1);

    if (!folder) {
      throw new ORPCError('NOT_FOUND', { message: 'Folder not found' });
    }

    // Determine target parent (use new parentId if provided, otherwise keep current)
    const targetParentId = input.parentId !== undefined ? input.parentId : folder.parentId;
    const targetName = input.name !== undefined ? input.name : folder.name;

    // Check for name conflict in the target directory (only if name or parentId is changing)
    if (input.name !== undefined || input.parentId !== undefined) {
      // Only check if name actually changed
      if (targetName !== folder.name || targetParentId !== folder.parentId) {
        const parentCondition = targetParentId === null 
          ? isNull(folders.parentId)
          : eq(folders.parentId, targetParentId);

        // Check for conflicts, excluding current folder
        const conflictCheck = await db.select()
          .from(folders)
          .where(
            and(
              eq(folders.userId, userId),
              parentCondition,
              eq(folders.name, targetName)
            )
          );

        // Filter out current folder manually
        const conflicts = conflictCheck.filter(f => f.id !== input.id);
        if (conflicts.length > 0) {
          throw new ORPCError('BAD_REQUEST', { message: 'A folder with this name already exists in this directory' });
        }
      }
    }

    // Prevent circular reference
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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    // Check if folder exists and belongs to user
    const [folder] = await db.select()
      .from(folders)
      .where(and(eq(folders.id, input.id), eq(folders.userId, userId)))
      .limit(1);

    if (!folder) {
      throw new ORPCError('NOT_FOUND', { message: 'Folder not found' });
    }

    // Recursively delete all child folders and move assets to parent or root
    async function deleteFolderRecursive(folderId: string, newParentId: string | null) {
      // Move all assets in this folder to new parent
      await db.update(assets)
        .set({ folderId: newParentId, updatedAt: new Date() })
        .where(eq(assets.folderId, folderId));

      // Get all child folders
      const childFolders = await db.select()
        .from(folders)
        .where(eq(folders.parentId, folderId));

      // Recursively delete child folders
      for (const child of childFolders) {
        await deleteFolderRecursive(child.id, newParentId);
      }

      // Delete the folder itself
      await db.delete(folders)
        .where(eq(folders.id, folderId));
    }

    await deleteFolderRecursive(input.id, folder.parentId);

    return { success: true };
  });

export const getFolder = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

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
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

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
