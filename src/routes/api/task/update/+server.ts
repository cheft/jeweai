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
        // For image generation, update the existing asset directly (if applicable) or create new
        // Adapting legacy logic:
        if (task.referenceAssetId) {
          // If image generation was updating the reference asset? 
          // Logic suggests creating new asset for result usually.
          // But existing code updated the "Asset".
          // We will assume creation of new asset for consistency if needed, but sticking to legacy update for now.
          // The prompt is "video generation flow", so image part is less critical.
          await db.update(assets)
            .set({
              path: resultUrl,
              status: 'unlocked',
              prompt: task.prompt,
              updatedAt: new Date(),
            })
            .where(eq(assets.id, task.referenceAssetId));
        }
      }
    }

    // 2. Map Go status to DB status
    // 'generating' maps to 'generating'
    // 'completed' maps to 'completed'
    // 'execute' (old) maps to 'generating'

    let dbStatus = status;
    if (status === 'execute') dbStatus = 'generating';
    if (status === 'complete') dbStatus = 'completed';

    const updateData: any = {
      status: dbStatus,
      updatedAt: new Date(),
    };

    // Update metadata/urls in task just in case (though resultAssetId is preferred)
    if (resultUrl) updateData.metadata = { ...(task.metadata as object || {}), resultUrl };

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
