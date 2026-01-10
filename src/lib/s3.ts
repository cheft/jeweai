import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CLOUDFLARE_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} from "$env/static/private";
import redis from './redis';

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!key) return '';

  // Check Redis cache
  const cacheKey = `video_url:${key}`;
  const cachedUrl = await redis.get(cacheKey);
  if (cachedUrl) return cachedUrl;

  // Generate URL
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET || 'jeweai',
    Key: key,
  });

  // Generate signed URL
  const url = await getSignedUrl(S3, command, { expiresIn });

  // Cache in Redis (store for 50 mins -> 3000s to be safe)
  await redis.set(cacheKey, url, 'EX', 3000);

  return url;
}
