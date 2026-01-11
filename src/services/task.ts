import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { tasks, assets } from '@/drizzle/schema';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_TOKEN,
  CLOUDFLARE_D1_TOKEN,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
  R2_PUBLIC_BUCKET,
} from "$env/static/private";

// Helper to upload to R2 using Cloudflare API
async function uploadToR2(key: string, data: Uint8Array, contentType: string, bucketName?: string) {
  console.log(`[R2] Uploading to key: ${key}, size: ${data.length}, bucket: ${bucketName || 'default'}`);

  // Standard R2 keys usually don't start with /.
  const safeKey = key.startsWith('/') ? key.slice(1) : key;
  const currentBucket = bucketName || R2_PUBLIC_BUCKET || 'covers';
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${currentBucket}/objects/${safeKey}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_R2_TOKEN}`,
        'Content-Type': contentType,
      },
      body: data as any
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[R2] API Upload failed: ${res.status} ${errorText}`);
      throw new Error(`R2 API Upload failed: ${res.status}`);
    }

    console.log(`[R2] Successfully uploaded via API to key: ${key}`);
    return key;
  } catch (err) {
    console.error(`[R2] Upload failed for key ${key}:`, err);
    throw err;
  }
}

export const create = os
  .input(
    z.object({
      image: z.string().optional(),
      assetId: z.string().optional(), // Reference asset ID from existing asset
      prompt: z.string(),
      styleId: z.string().optional(),
      isImageOnly: z.boolean().default(false),
      filename: z.string().optional(),
      orientation: z.enum(['landscape', 'portrait']).default('landscape'),
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: Get from auth context

    // Compute dimensions based on orientation
    const width = input.orientation === 'portrait' ? 720 : 1280;
    const height = input.orientation === 'portrait' ? 1280 : 720;

    try {
      let imageKey = '';
      let assetId = '';

      // If assetId is provided, use existing asset
      if (input.assetId) {
        const [existingAsset] = await db.select()
          .from(assets)
          .where(and(eq(assets.id, input.assetId), eq(assets.userId, userId)))
          .limit(1);
        
        if (!existingAsset) {
          throw new ORPCError('NOT_FOUND', { message: 'Reference asset not found' });
        }
        
        if (existingAsset.type !== 'image') {
          throw new ORPCError('BAD_REQUEST', { message: 'Reference asset must be an image' });
        }
        
        assetId = existingAsset.id;
        imageKey = existingAsset.path || '';
      } else if (input.image) {
        // 1. Process and Upload image to R2 (Private Bucket 'jeweai')
        const base64Data = input.image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const id = nanoid();
        const safeFilename = (input.filename || 'input.png').replace(/[^a-zA-Z0-9.]/g, '_');

        // Path: userID/id_filename
        imageKey = `${userId}/${id}_${safeFilename}`;

        // Upload to Private Bucket (R2_BUCKET usually 'jeweai')
        await uploadToR2(imageKey, imageBuffer, 'image/png', R2_BUCKET || 'jeweai');

        // Create Asset record (unlocked immediately)
        const [newAsset] = await db.insert(assets).values({
          id: nanoid(),
          userId,
          name: safeFilename,
          type: 'image',
          source: 'upload', // Changed from 'ai' to 'upload' for the reference
          path: imageKey,
          status: 'unlocked', // Unlocked immediately
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        assetId = newAsset.id;
      }

      // 2. Call Golang Service
      const endpoint = input.isImageOnly ? '/queue/addImage' : '/queue/addVideo';

      // Payload for Go
      const goPayload: any = {
        Prompt: input.prompt,
        StyleID: input.styleId,
        AssetID: assetId,
        UserID: userId,
        ImagePath: imageKey,
        Width: width,
        Height: height,
      };

      if (!input.isImageOnly) {
        goPayload.VideoID = nanoid();
      }

      const goResponse = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goPayload)
      });

      if (!goResponse.ok) {
        throw new Error(`Go service error: ${goResponse.status}`);
      }

      const result = await goResponse.json() as { taskId: string };
      const taskId = result.taskId;

      // 3. Record Task in Database
      await db.insert(tasks).values({
        id: taskId,
        userId,
        // assetId: assetId, // Deprecated? Schema seems to use referenceAssetId now
        // But let's keep assetId if migration didn't remove it or just use referenceAssetId
        referenceAssetId: assetId,
        prompt: input.prompt,
        type: input.isImageOnly ? 'image' : 'video',
        styleId: input.styleId,
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          source: 'gallery'
        }
      });

      return {
        success: true,
        taskId
      };

    } catch (error: any) {
      console.error('Task creation error:', error);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: error.message || 'Failed to start generation task'
      });
    }
  });

import { desc, eq, getTableColumns, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

export const list = os
  .handler(async ({ context }: { context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    const refAssets = alias(assets, 'ref');
    const resAssets = alias(assets, 'res');

    // Fetch tasks from database with joins
    const allTasks = await db.select({
      ...getTableColumns(tasks), // Select all task columns
      referenceCover: refAssets.coverPath,
      resultCover: resAssets.coverPath,
    })
      .from(tasks)
      .leftJoin(refAssets, eq(tasks.referenceAssetId, refAssets.id))
      .leftJoin(resAssets, eq(tasks.resultAssetId, resAssets.id))
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return allTasks.map((row: any) => {
      // Logic: 
      // thumbnail: resultCover (video thumb) > referenceCover (image/ref thumb) > null
      // referenceImage: referenceCover
      // assetLink: resultAssetId (if video completed) > referenceAssetId

      const thumbnail = row.resultCover || row.referenceCover || null;
      const assetLink = row.resultAssetId || row.referenceAssetId || row.id;

      return {
        ...row, // This spreads all task columns
        thumbnail: thumbnail,
        referenceImage: row.referenceCover,
        assetLink: assetLink,
      };
    });
  });

export const get = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: { id: string }, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: auth

    const refAssets = alias(assets, 'ref');
    const resAssets = alias(assets, 'res');

    const [task] = await db.select({
      ...getTableColumns(tasks),
      referenceCover: refAssets.coverPath,
      resultCover: resAssets.coverPath,
    })
      .from(tasks)
      .leftJoin(refAssets, eq(tasks.referenceAssetId, refAssets.id))
      .leftJoin(resAssets, eq(tasks.resultAssetId, resAssets.id))
      .where(and(eq(tasks.id, input.id), eq(tasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new ORPCError('NOT_FOUND', { message: 'Task not found' });
    }

    const thumbnail = task.resultCover || task.referenceCover || null;

    return {
      ...task,
      thumbnail,
      referenceImage: task.referenceCover,
    };
  });
