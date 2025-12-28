import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { assets } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import {
  BUCKET,
  AI_KEY,
} from "$env/static/private";
console.log(BUCKET, AI_KEY)

// Helper to upload to R2
async function uploadToR2(bucket: R2Bucket, key: string, data: ArrayBuffer | Uint8Array, contentType: string) {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
  return key; // Return key or full public URL if you have a public domain configured
}

export const generateVideo = os
  .input(
    z.object({
      image: z.string(),
      prompt: z.string(),
      filename: z.string().optional(),
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, env } = context;
    // const BUCKET = env?.BUCKET;
    // const API_KEY = env?.AI_KEY;

    if (!BUCKET) throw new Error('R2 Bucket not configured');
    if (!AI_KEY) throw new Error('OPENAI_API_KEY not configured');

    const openai = new OpenAI({
      apiKey: AI_KEY,
      baseURL: 'https://api.laozhang.ai/v1'
    });

    try {
      // 1. Upload source image to R2
      const base64Data = input.image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const imageId = nanoid()
      const imageKey = `uploads/${imageId}.png`;
      // await uploadToR2(BUCKET, imageKey, imageBuffer, 'image/png');

      // 2. Record source asset
      const userId = '1111111'; // TODO: Get from auth context
      await db.insert(assets).values({
        id: imageId,
        name: input.filename || 'uploaded-image.png',
        type: 'image',
        source: 'upload',
        url: imageKey,
        path: imageKey,
        size: imageBuffer.length,
        mimeType: 'image/png',
        userId,
      });

      // 3. Start Video Generation
      const apiFile = new File([imageBuffer], 'input.png', { type: 'image/png' });
      const videoResponse = await openai.videos.create({
        model: 'sora_video2-15s',
        prompt: input.prompt,
        size: '720x1280',
        input_reference: apiFile as any
      });

      const videoTaskId = videoResponse.id;
      const videoAssetId = crypto.randomUUID();

      // 4. Record Pending Video Asset
      await db.insert(assets).values({
        id: videoAssetId,
        fromAssetId: imageId,
        name: `generated-${videoTaskId}.mp4`,
        type: 'video',
        source: 'ai',
        status: 2, // pending
        path: `generated/${videoAssetId}.mp4`,
        metadata: { aiVideoId: videoTaskId, prompt: input.prompt },
        prompt: input.prompt,
        userId,
      });

      return {
        success: true,
        videoAssetId,
        videoTaskId
      };

    } catch (error) {
      console.error(error);
      throw new Error('Failed to start video generation');
    }
  });

export const checkStatus = os
  .input(z.object({
    videoAssetId: z.string(),
    videoTaskId: z.string()
  }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db, env } = context;
    const API_KEY = env?.OPENAI_API_KEY;

    try {
      const res = await fetch(`https://api.laozhang.ai/v1/videos/${input.videoTaskId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });

      if (!res.ok) throw new Error('Fetch failed');
      const data: any = await res.json();

      if (data.status === 'succeeded' && data.url) {
        // Update DB
        await db.update(assets)
          .set({
            status: 1,
            url: data.url, // In real world we might download to R2 first
            updatedAt: new Date()
          })
          .where(eq(assets.id, input.videoAssetId));

        return { status: 'succeeded', url: data.url };
      }

      return { status: data.status || 'pending' };
    } catch (error) {
      console.error('Check status error:', error);
      return { status: 'error' };
    }
  });


