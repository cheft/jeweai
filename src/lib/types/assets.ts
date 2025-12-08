export type AssetType = 'folder' | 'video';

export interface Asset {
	id: string;
	parentId: string | null;
	name: string;
	type: AssetType;
	thumbnail?: string; // For videos
	duration?: string; // For videos
	createdAt: number;
}
