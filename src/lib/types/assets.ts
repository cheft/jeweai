export type AssetType = 'folder' | 'video' | 'image';
export type AssetStatus = 'locked' | 'unlocked';

export interface Asset {
	id: string;
	parentId: string | null;
	folderId?: string | null;
	name: string;
	type: AssetType;
	status?: AssetStatus;
	thumbnail?: string; // For videos/images - cover URL from covers bucket
	coverUrl?: string; // Cover URL from covers bucket
	coverPath?: string; // Cover path in covers bucket
	path?: string; // Original file path in jeweai bucket
	duration?: string; // For videos
	width?: number | null;
	height?: number | null;
	createdAt: number;
	updatedAt?: number;
}
