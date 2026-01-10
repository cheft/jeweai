import { json } from '@sveltejs/kit';
import { db } from '@/src/services/db';
import { assets } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getPresignedUrl } from '@/src/lib/s3';
import { R2_PUBLIC_BUCKET } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;
  if (!id) return json({ error: 'Missing ID' }, { status: 400 });

  try {
    const result = await db.select().from(assets).where(eq(assets.id, id));
    if (result.length === 0) {
      return json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = result[0];

    // If it's a cover or public asset, return the public URL if possible?
    // User requirement: "videos... stored in jeweai bucket (private)... request url from redis... timeline play".
    // "thumb stored in covers bucket... public".

    // If asset type is video, generate presigned URL
    if (asset.type === 'video' && asset.path) {
      const url = await getPresignedUrl(asset.path);
      return json({ url });
    }

    // If it's an image/cover, usually it's in public bucket.
    // Construct public URL. 
    // Assuming covers bucket is mapped to a domain or we return the path?
    // Schema has 'path' and 'url'. 'url' field in assets might store the full URL or relative?
    // Worker updates 'url' with 'movedPath'.
    // Logic: if 'url' field is set, return it.

    if (asset.path) {
      // Check if it's a full URL
      if (asset.path.startsWith('http')) return json({ url: asset.path });
      // Construct public R2 URL? 
      return json({ url: asset.path });
    }

    // Fallback
    return json({ url: '' });

  } catch (err: any) {
    console.error('Get Asset URL Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
};
