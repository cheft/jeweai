import { json } from '@sveltejs/kit';
import { db } from '@/src/services/db';
import { tasks, assets } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload: any = await request.json();
    console.log('[Webhook] Task Update received:', payload);

    const { taskId, status, resultUrl, thumbnailUrl, duration, coverPath, videoPath, videoCoverPath } = payload;

    if (!taskId || !status) {
      return json({ error: 'Missing taskId or status' }, { status: 400 });
    }

    // Check if task is already finished
    const existing = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (existing.length === 0) {
      return json({ error: 'Task not found' }, { status: 404 });
    }

    const task = existing[0];
    if (task.status === 'completed' || task.status === 'failed') {
      return json({ success: true, message: 'Task already finished' });
    }

    // 1. Update/Create Assets based on Status
    if (status === 'generating') {
      // Stage 1: Update Reference Image Cover (720p)
      // Go sends 'coverPath' which is the R2 key for the generated cover
      if (task.referenceAssetId && coverPath) {
        await db.update(assets)
          .set({
            coverPath: coverPath,
            updatedAt: new Date()
          })
          .where(eq(assets.id, task.referenceAssetId));
        console.log(`[Webhook] Reference Asset ${task.referenceAssetId} cover updated: ${coverPath}`);
      }
    } else if (status === 'completed') {
      // Stage 2: Completion Logic
      if (task.type === 'video') {
        // Create a NEW asset for the generated video
        // Go sends 'videoPath' (resultUrl) and 'videoCoverPath' (thumbnailUrl)
        const finalVideoPath = videoPath || resultUrl;
        const finalCoverPath = videoCoverPath || thumbnailUrl;
        const videoWidth = payload.width || 1280;
        const videoHeight = payload.height || 720;

        // Calculate aspectRatio from dimensions if not provided
        const calculateAspectRatio = (w: number, h: number): string => {
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const divisor = gcd(w, h);
          return `${w / divisor}:${h / divisor}`;
        };
        const aspectRatio = payload.aspectRatio || calculateAspectRatio(videoWidth, videoHeight);

        const [newVideoAsset] = await db.insert(assets).values({
          id: nanoid(),
          userId: task.userId || '',
          name: `video_${task.id}.mp4`,
          type: 'video',
          source: 'ai',
          path: finalVideoPath, // Perm path in jeweai bucket
          coverPath: finalCoverPath, // Video thumbnail path
          fromAssetId: task.referenceAssetId, // Link to reference image
          prompt: task.prompt,
          width: videoWidth,
          height: videoHeight,
          aspectRatio: aspectRatio,
          status: 'unlocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        console.log(`[Webhook] Created new video asset: ${newVideoAsset.id}`);

        // Update Task with resultAssetId
        await db.update(tasks)
          .set({
            resultAssetId: newVideoAsset.id,
            status: 'completed',
            updatedAt: new Date()
          })
          .where(eq(tasks.id, taskId));

      } else if (task.type === 'image') {
        // For image generation, create a NEW asset for the generated image
        // Go sends 'imagePath' and 'imageCoverPath'
        const imagePath = payload.imagePath || resultUrl;
        const imageCoverPath = payload.imageCoverPath || thumbnailUrl;
        const imageWidth = payload.width || 1024;
        const imageHeight = payload.height || 1024;

        // Calculate aspectRatio from dimensions if not provided
        const calculateAspectRatio = (w: number, h: number): string => {
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const divisor = gcd(w, h);
          return `${w / divisor}:${h / divisor}`;
        };
        const aspectRatio = payload.aspectRatio || calculateAspectRatio(imageWidth, imageHeight);

        if (!imagePath) {
          console.error(`[Webhook] Missing imagePath for image task ${taskId}`);
          return json({ error: 'Missing imagePath' }, { status: 400 });
        }

        const [newImageAsset] = await db.insert(assets).values({
          id: nanoid(),
          userId: task.userId || '',
          name: `image_${task.id}.png`,
          type: 'image',
          source: 'ai',
          path: imagePath, // Perm path in jeweai bucket (private)
          coverPath: imageCoverPath, // Image cover path in covers bucket (public)
          fromAssetId: task.referenceAssetId, // Link to reference image if exists
          prompt: task.prompt,
          width: imageWidth,
          height: imageHeight,
          aspectRatio: aspectRatio,
          status: 'unlocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        console.log(`[Webhook] Created new image asset: ${newImageAsset.id}`);

        // Update Task with resultAssetId
        await db.update(tasks)
          .set({
            resultAssetId: newImageAsset.id,
            status: 'completed',
            updatedAt: new Date()
          })
          .where(eq(tasks.id, taskId));
      }
    }

    // 2. Map Go status to DB status
    // 'generating' maps to 'generating'
    // 'completed' maps to 'completed'
    // 'execute' (old) maps to 'generating'

    let dbStatus = status;
    if (status === 'execute') dbStatus = 'generating';
    if (status === 'complete') dbStatus = 'completed';

    const { externalId, failureReason, errorMessage } = payload;

    const updateData: any = {
      status: dbStatus,
      updatedAt: new Date(),
    };

    // Update metadata/urls in task
    const newMetadata: any = { ...(task.metadata as object || {}) };
    if (resultUrl) newMetadata.resultUrl = resultUrl;
    if (externalId) newMetadata.externalId = externalId;
    if (failureReason) newMetadata.failureReason = failureReason;
    if (errorMessage) newMetadata.errorMessage = errorMessage;

    updateData.metadata = newMetadata;

    await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));

    console.log(`[Webhook] Task ${taskId} updated to ${dbStatus}`);

    return json({ success: true });
  } catch (err: any) {
    console.error('[Webhook] Update Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
};
