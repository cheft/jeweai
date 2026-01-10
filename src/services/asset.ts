import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { assets, tasks } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getPresignedUrl } from '$lib/s3';

const R2_COVER_DOMAIN = 'https://pub-0f1ebbb2b0ed48f9a0dbe8a44a832060.r2.dev';

export const get = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: { id: string }, context: any }) => {
    const { db } = context;
    const userId = 'user_123456'; // TODO: auth

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
      coverUrl = `${R2_COVER_DOMAIN}/${asset.coverPath}`;
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
        referenceAsset = {
          id: refAsset.id,
          coverUrl: refAsset.coverPath ? `${R2_COVER_DOMAIN}/${refAsset.coverPath}` : null,
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
