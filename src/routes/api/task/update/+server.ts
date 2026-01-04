import { json } from '@sveltejs/kit';
import { db } from '@/src/services/db';
import { tasks, assets } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    console.log('[Webhook] Task Update received:', payload);

    const { taskId, status, resultUrl, thumbnailUrl, duration } = payload;

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

    // 1. Update/Create Assets
    if (status === 'execute') {
      // Stage 1: Update Reference Image Thumbnail
      if (task.assetId && thumbnailUrl) {
        await db.update(assets)
          .set({
            path: thumbnailUrl,
            updatedAt: new Date()
          })
          .where(eq(assets.id, task.assetId));
        console.log(`[Webhook] Reference Asset ${task.assetId} thumbnail updated`);
      }
    } else if (status === 'complete') {
      // Stage 2: Completion Logic
      if (task.type === 'video') {
        // Create a NEW asset for the generated video
        const [newVideoAsset] = await db.insert(assets).values({
          id: nanoid(),
          userId: task.userId || '',
          name: `video_${task.id}.mp4`,
          type: 'video',
          source: 'ai',
          url: resultUrl, // Permanent path in jeweai bucket
          path: thumbnailUrl, // Video thumbnail path
          fromAssetId: task.assetId, // Link to reference image
          prompt: task.prompt, // Prompt bound to the video
          status: 'unlocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        console.log(`[Webhook] Created new video asset: ${newVideoAsset.id}`);

        // Unlock reference image asset and update its URL (now moved to jeweai)
        if (task.assetId) {
          const movedPath = task.referenceImage?.startsWith('locks/')
            ? task.referenceImage.substring(6)
            : task.referenceImage;

          await db.update(assets)
            .set({
              status: 'unlocked',
              url: movedPath, // The path where the original was moved to
              updatedAt: new Date()
            })
            .where(eq(assets.id, task.assetId));
          console.log(`[Webhook] Reference Asset ${task.assetId} unlocked at ${movedPath}`);
        }
      } else if (task.type === 'image') {
        // For image generation, update the existing asset directly
        if (task.assetId) {
          await db.update(assets)
            .set({
              url: resultUrl,
              status: 'unlocked',
              prompt: task.prompt, // Bound to the result
              updatedAt: new Date(),
            })
            .where(eq(assets.id, task.assetId));
          console.log(`[Webhook] Image Asset ${task.assetId} unlocked and updated`);
        }
      }
    }

    // 2. Map Go status to DB status
    let dbStatus = status;
    if (status === 'execute') dbStatus = 'generating';
    if (status === 'complete') dbStatus = 'completed';

    const updateData: any = {
      status: dbStatus,
      updatedAt: new Date(),
    };

    if (resultUrl) updateData.resultUrl = resultUrl;
    if (thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl;
    if (duration) updateData.duration = duration;

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
