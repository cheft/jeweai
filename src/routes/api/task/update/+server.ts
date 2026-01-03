import { json } from '@sveltejs/kit';
import { db } from '@/src/services/db';
import { tasks } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    console.log('[Webhook] Task Update received:', payload);

    const { taskId, status, resultUrl, thumbnailUrl, duration } = payload;

    if (!taskId || !status) {
      return json({ error: 'Missing taskId or status' }, { status: 400 });
    }

    // Map Go status to DB status if needed
    // Go might send 'executing', 'completed', 'failed'
    // Our DB status: 'queued', 'generating', 'completed', 'failed'
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
