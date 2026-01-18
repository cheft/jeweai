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
  GRSAI_BASE_URL,
  GRSAI_KEY,
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
      aspectRatio: z.string().optional(), // e.g., '1:1', '9:16', '16:9', '3:2', '2:3'
    })
  )
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const { db } = context;
    const userId = 'userid123456'; // TODO: Get from auth context

    // Function to calculate dimensions based on aspect ratio
    function getDimensions(aspectRatio: string | undefined, isImageOnly: boolean): { width: number; height: number } {
      if (!aspectRatio) {
        // Fallback to orientation-based calculation
        return input.orientation === 'portrait' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
      }

      if (isImageOnly) {
        // Image dimensions (higher resolution)
        switch (aspectRatio) {
          case '1:1': return { width: 2160, height: 2160 };
          case '3:2': return { width: 3240, height: 2160 };
          case '2:3': return { width: 1440, height: 2160 };
          case '9:16': return { width: 2160, height: 3840 };
          case '16:9': return { width: 3840, height: 2160 };
          default: return { width: 2160, height: 2160 }; // Default to square
        }
      } else {
        // Video dimensions (720p/1080p)
        switch (aspectRatio) {
          case '9:16': return { width: 720, height: 1280 };
          case '16:9': return { width: 1280, height: 720 };
          default: return { width: 720, height: 1280 }; // Default to portrait
        }
      }
    }

    // Compute dimensions based on aspect ratio
    const { width, height } = getDimensions(input.aspectRatio, input.isImageOnly);

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
        AspectRatio: input.aspectRatio || (input.isImageOnly ? '1:1' : '9:16'), // Default aspect ratios
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

import { desc, getTableColumns } from 'drizzle-orm';
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
      resultAspectRatio: resAssets.aspectRatio, // Get aspect ratio from result asset
    })
      .from(tasks)
      .leftJoin(refAssets, eq(tasks.referenceAssetId, refAssets.id))
      .leftJoin(resAssets, eq(tasks.resultAssetId, resAssets.id))
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return allTasks.map((row: any) => {
      // Logic: 
      // thumbnail: resultCover (video thumb) > referenceCover (image/ref thumb) > null
      // referenceImage: referenceCover (may be null for queued/generating tasks)
      // assetLink: resultAssetId (if video completed) > referenceAssetId
      // prompt: always from task.prompt
      // aspectRatio: from result asset if available

      const thumbnail = row.resultCover || row.referenceCover || null;
      const assetLink = row.resultAssetId || row.referenceAssetId || row.id;

      return {
        ...row, // This spreads all task columns including prompt
        thumbnail: thumbnail,
        referenceImage: row.referenceCover, // May be null initially, populated by Go worker
        assetLink: assetLink,
        prompt: row.prompt, // Explicitly include prompt (already in row, but making it clear)
        aspectRatio: row.resultAspectRatio, // Aspect ratio from result asset
      };
    });
  });

export const get = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: { id: string }, context: any }) => {
    const { db } = context;
    const userId = 'userid123456';

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


export const retry = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }: { input: { id: string }, context: any }) => {
    const { db } = context;
    const userId = 'userid123456';

    const [existingTask] = await db.select()
      .from(tasks)
      .where(and(eq(tasks.id, input.id), eq(tasks.userId, userId)))
      .limit(1);

    if (!existingTask) {
      throw new ORPCError('NOT_FOUND', { message: 'Task not found' });
    }

    // Prepare payload for Go Service based on existing task
    const isImageOnly = existingTask.type === 'image';
    const endpoint = isImageOnly ? '/queue/addImage' : '/queue/addVideo';

    // We need to resolve the image path from referenceAssetId if possible
    let imageKey = "";
    if (existingTask.referenceAssetId) {
      const [refAsset] = await db.select().from(assets).where(eq(assets.id, existingTask.referenceAssetId)).limit(1);
      if (refAsset) {
        imageKey = refAsset.path || "";
      }
    }

    // Default dimensions if not stored? Task table doesn't store dimensions directly, 
    // but the original Create call computed them.
    // We might need to assume defaults or look up if we stored metadata. 
    // For now, default to portrait (720x1280) or landscape?
    // Let's check metadata or just use standard defaults.
    // Existing task schema doesn't seem to have width/height columns.
    // However, the user flow usually defaults to some values.
    // Let's use 720x1280 (Portrait) or 1280x720 (Landscape).
    // Can we infer from style or previous inputs? No.
    // Let's default to Portrait 720x1280 as it seems common for this app (mobile first?).
    // Actually, looking at `create` handler: 
    // const width = input.orientation === 'portrait' ? 720 : 1280;
    // We don't have orientation in `tasks` table. 
    // We could try to infer from metadata if it exists, but `tasks.metadata` is json.
    // For safety, let's just use 720x1280. 

    // Better: If we can't be sure, send 0 or let Go handle defaults? 
    // Go worker expects integers.
    // Let's use 1080x1920 or similar? 
    // In `create`: portrait=720x1280.
    const width = 720;
    const height = 1280;

    const goPayload: any = {
      Prompt: existingTask.prompt,
      StyleID: existingTask.styleId || "",
      AssetID: existingTask.referenceAssetId || "", // This logic in Create was confusing (AssetID vs ReferenceAssetID). Go uses AssetID for logging?
      UserID: userId,
      ImagePath: imageKey,
      Width: width,
      Height: height,
    };

    if (!isImageOnly) {
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
    const newTaskId = result.taskId;

    // Insert new task
    await db.insert(tasks).values({
      id: newTaskId,
      userId,
      referenceAssetId: existingTask.referenceAssetId,
      prompt: existingTask.prompt,
      type: existingTask.type,
      styleId: existingTask.styleId,
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: 'retry',
        originalTaskId: existingTask.id
      }
    });

    return {
      success: true,
      taskId: newTaskId
    };
  });

export const polish = os
  .input(
    z.object({
      prompt: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const baseURL = GRSAI_BASE_URL || "https://grsai.dakka.com.cn/v1";
    const url = `${baseURL}/chat/completions`;

    const systemPrompt = `你是一名资深珠宝摄影师与珠宝设计师，负责将用户的简述转换为可直接用于AI图像/视频生成的精简提示词。

严格规则（必须遵守）

不得向用户提问；缺失信息一律用“默认值”补齐。
仅输出成品提示，不要解释、不要分支说明、不要额外文案。
总长度尽量精简（建议≤120个中文字符，最多两行）；只在必要处夹少量英文专业词（如 macro, rim light, shallow DOF）。
绝不出现品牌logo/水印/乱码文字；避免不真实反光；避免宝石数量/爪数/结构互相矛盾。
必须强调“外观一致性：不改变戒指设计、宝石形状、爪镶数量、金属颜色”。
默认值（缺省时直接套用）

商业目标：电商成片（真实、质感高级、可上架）
平台：通用（不写平台专属参数）
材质/质感：18K金或铂金（金属拉丝/镜面按风格二选一）
光线：三点布光，主光+轮廓光（rim light），柔光箱
镜头/摄影：macro，50–100mm等效，shallow depth of field
构图：近景特写，产品居中或三分法，干净背景
场景/道具：极简背景或轻质道具（不喧宾夺主）
色彩/风格：中性还原，细节清晰
输出格式（最多两行）

主提示（中文为主，夹必要英文关键词；可在末尾加入“参考图一致性”描述）
可选：负面/约束（如：no logo, no watermark, avoid glare）
示例 输入：白金单钻戒指，走电商风，参考图：URL 输出： 白金单钻戒指，macro 近景特写，三点布光+rim light，shallow DOF，极简灰底，真实金属质感，细节清晰，参考图外观一致（戒臂比例/爪数/金属颜色不变），约束：no logo, no watermark, avoid exaggerated glare`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          "Authorization": "Bearer " + (GRSAI_KEY || GRSAI_BASE_URL),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "gemini-2.5-flash",
          "stream": false,
          "messages": [
            {
              "role": "system",
              "content": systemPrompt
            },
            {
              "role": "user",
              "content": input.prompt
            }
          ]
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Polish] API error: ${res.status} ${errorText}`);
        throw new Error(`Polish API failed: ${res.status}`);
      }

      const result: any = await res.json();
      const polishedPrompt = result.choices?.[0]?.message?.content;

      if (!polishedPrompt) {
        console.error('[Polish] Unexpected API response:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response from Polish API');
      }

      return polishedPrompt;
    } catch (err) {
      console.error('[Polish] Error:', err);
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to polish prompt'
      });
    }
  });
