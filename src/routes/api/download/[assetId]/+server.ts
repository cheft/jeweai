
import { db } from "@/src/services/db";
import { assets } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getPresignedUrl } from "@/src/lib/s3";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
    const assetId = params.assetId;
    if (!assetId) {
        throw error(400, "Asset ID is required");
    }

    // TODO: Auth check - verify user has access to this asset
    // For now assuming public/internal usage or relying on parent auth if any (session cookies?)

    const [asset] = await db.select()
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);

    if (!asset) {
        throw error(404, "Asset not found");
    }

    // Determine URL to fetch from R2
    let downloadUrl: string | null = null;

    // Prefer original path (private bucket)
    if (asset.path) {
        downloadUrl = await getPresignedUrl(asset.path);
    } else if (asset.coverPath) {
        // Fallback to cover if proper path not found (e.g. some image assets might only use cover?)
        // But usually Asset.path is the source.
        // If coverPath is used, it might be public, but we can still sign it or just fetch it.
        downloadUrl = await getPresignedUrl(asset.coverPath);
    }

    if (!downloadUrl) {
        throw error(404, "File not found");
    }

    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw error(response.status, "Failed to fetch file from storage");
        }

        // Set headers for download
        const headers = new Headers(response.headers);
        headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(asset.name || 'file')}"`);
        headers.set("Access-Control-Allow-Origin", "*"); // Allow usage from frontend JS

        return new Response(response.body, {
            status: 200,
            headers: headers
        });
    } catch (err) {
        console.error("Download proxy error:", err);
        throw error(500, "Internal Server Error");
    }
};
