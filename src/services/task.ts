import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { tasks } from '@/drizzle/schema';
import { nanoid } from 'nanoid';
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
async function uploadToR2(key: string, data: Uint8Array, contentType: string) {
  console.log(`[R2] Uploading to key: ${key}, size: ${data.length}`);

  // Standard R2 keys usually don't start with /.
  const safeKey = key.startsWith('/') ? key.slice(1) : key;
  const currentBucket = R2_PUBLIC_BUCKET || 'covers';
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
      prompt: z.string(),
      styleId: z.string().optional(),
      isImageOnly: z.boolean().default(false),
      filename: z.string().optional(),
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'user_123456'; // TODO: Get from auth context

    try {
      let imageKey = '';
      if (input.image) {
        // 1. Process and Upload image to R2
        const base64Data = input.image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const id = nanoid();
        const safeFilename = (input.filename || 'input.png').replace(/[^a-zA-Z0-9.]/g, '_');
        imageKey = `/temp/${userId}/${id}_${safeFilename}`;

        await uploadToR2(imageKey, imageBuffer, 'image/png');
      }

      // 2. Call Golang Service
      const endpoint = input.isImageOnly ? '/queue/addImage' : '/queue/addVideo';

      // Determine what to send based on Go's expectations
      const goPayload: any = {
        Prompt: input.prompt,
        StyleID: input.styleId,
      };

      if (input.isImageOnly) {
        goPayload.ImagePath = imageKey;
        goPayload.ImgName = 'jewelry_image';
        goPayload.Width = 1024;
        goPayload.Height = 1024;
      } else {
        goPayload.ImagePath = imageKey;
        goPayload.VideoID = nanoid(); // Go will override if needed, but good to Have
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
        prompt: input.prompt,
        type: input.isImageOnly ? 'image' : 'video',
        styleId: input.styleId,
        referenceImage: imageKey,
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

export const list = os
  .handler(async ({ context }: { context: any }) => {
    const { db } = context;
    const userId = 'user_123456'; // TODO: auth
    // This could serve the /timeline page
    return await db.select().from(tasks)/*.where(eq(tasks.userId, userId))*/;
  });
