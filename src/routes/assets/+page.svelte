<script lang="ts">
	import AssetsGrid from '$lib/components/assets/AssetsGrid.svelte';
	import ContextMenu from '$lib/components/assets/ContextMenu.svelte';
	import type { Asset } from '$lib/types/assets';
	import { onMount } from 'svelte';

	// Icons
	import galleryRing from '$lib/assets/gallery-ring.png';
	import galleryNecklace from '$lib/assets/gallery-necklace.png';
	import galleryEarrings from '$lib/assets/gallery-earrings.png';
	import galleryBracelet from '$lib/assets/gallery-bracelet.png';
	import galleryPortrait1 from '$lib/assets/gallery-portrait-1.png';
	import galleryPortrait2 from '$lib/assets/gallery-portrait-2.png';
	import styleLuxury from '$lib/assets/style-luxury.png';
	import styleUrban from '$lib/assets/style-urban.png';

	// State
	let assets = $state<Asset[]>([
		// Initial Roots
		{ id: 'f1', parentId: null, name: 'Campaign 2024', type: 'folder', createdAt: Date.now() },
		{ id: 'f2', parentId: null, name: 'Social Media', type: 'folder', createdAt: Date.now() },
		{
			id: 'v1',
			parentId: null,
			name: 'Intro',
			type: 'video',
			thumbnail: galleryRing,
			duration: '0:15',
			createdAt: Date.now()
		},
		// Inside Campaign 2024
		{
			id: 'v2',
			parentId: 'f1',
			name: 'Teaser',
			type: 'video',
			thumbnail: galleryPortrait1,
			duration: '0:12',
			createdAt: Date.now()
		},
		{
			id: 'v3',
			parentId: 'f1',
			name: 'Full Ad',
			type: 'video',
			thumbnail: galleryNecklace,
			duration: '0:30',
			createdAt: Date.now()
		},
		// Nested Folder
		{ id: 'f3', parentId: 'f1', name: 'Drafts', type: 'folder', createdAt: Date.now() },
		// Inside Drafts
		{
			id: 'v4',
			parentId: 'f3',
			name: 'Draft 1',
			type: 'video',
			thumbnail: galleryEarrings,
			duration: '0:10',
			createdAt: Date.now()
		}
	]);

	let currentFolderId = $state<string | null>(null);
	let contextMenu = $state<{ x: number; y: number; assetId: string } | null>(null);

	// Derived
	let visibleAssets = $derived(assets.filter((a) => a.parentId === currentFolderId));
	let currentPath = $derived(buildPath(currentFolderId));

	function buildPath(folderId: string | null): Asset[] {
		if (!folderId) return [];
		const folder = assets.find((a) => a.id === folderId);
		if (!folder) return [];
		return [...buildPath(folder.parentId), folder];
	}

	// Actions
	function handleNavigate(folderId: string | null) {
		currentFolderId = folderId;
		contextMenu = null;
	}

	function handleCreateFolder() {
		const newFolder: Asset = {
			id: crypto.randomUUID(),
			parentId: currentFolderId,
			name: 'New Folder',
			type: 'folder',
			createdAt: Date.now()
		};
		assets = [...assets, newFolder];
	}

	function handleRename(id: string, newName: string) {
		const index = assets.findIndex((a) => a.id === id);
		if (index !== -1) {
			// In a real app, we'd trigger UI for input. simpler for now: prompt
			// Note: Prompt blocks execution, maybe use a modal or inline edit later.
			// For now, I'll use window.prompt as a quick impl, but better is inline.
			// Actually, the user requirement didn't specify interaction details, just "menu to rename".
			// I'll stick to prompt for MVP speed or implement a specialized dialog.
			// Let's use prompt for simplicity as we don't have a Dialog component ready for this.
			assets[index].name = newName;
		}
	}

	function handleDelete(id: string) {
		// Recursive delete
		const toDeleteIds = new Set<string>();
		function collect(targetId: string) {
			toDeleteIds.add(targetId);
			assets.filter((a) => a.parentId === targetId).forEach((child) => collect(child.id));
		}
		collect(id);
		assets = assets.filter((a) => !toDeleteIds.has(a.id));
	}

	function handleMove(draggedId: string, targetId: string) {
		const draggedIndex = assets.findIndex((a) => a.id === draggedId);
		const target = assets.find((a) => a.id === targetId);

		if (draggedIndex === -1 || !target || target.type !== 'folder') return;

		// Prevent circular move (folder into itself or its children)
		let checkId: string | null = target.id;
		while (checkId) {
			if (checkId === draggedId) return; // Cannot move into self/child
			const p = assets.find((a) => a.id === checkId);
			checkId = p?.parentId || null;
		}

		assets[draggedIndex].parentId = target.id;
		// Re-assign to trigger reactivity if needed (Svelte 5 runes usually handle deep reactivity on arrays if they are proxies, but let's be safe)
		// assets = [...assets];
	}

	// Context Menu Handlers
	function onContextMenu(e: MouseEvent, asset: Asset) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, assetId: asset.id };
	}

	function triggerRename(assetId: string) {
		const asset = assets.find((a) => a.id === assetId);
		if (asset) {
			const newName = window.prompt('Rename to:', asset.name);
			if (newName) handleRename(assetId, newName);
		}
	}
</script>

<div class="min-h-screen px-6 pt-24 pb-20">
	<div class="container mx-auto">
		<!-- Header & Breadcrumbs -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-white">Assets</h1>
				<div class="flex items-center gap-2 text-sm text-gray-400">
					<button
						class="transition-colors hover:text-seko-accent"
						onclick={() => handleNavigate(null)}
					>
						Home
					</button>
					{#each currentPath as folder}
						<span class="text-gray-600">/</span>
						<button
							class="transition-colors hover:text-seko-accent"
							onclick={() => handleNavigate(folder.id)}
						>
							{folder.name}
						</button>
					{/each}
				</div>
			</div>

			<button
				class="rounded-full bg-seko-accent px-6 py-2 font-bold text-black transition-transform hover:scale-105"
				onclick={handleCreateFolder}
			>
				+ New Folder
			</button>
		</div>

		<AssetsGrid
			items={visibleAssets}
			onSelect={() => {}}
			onDblClick={(asset) => {
				if (asset.type === 'folder') handleNavigate(asset.id);
			}}
			{onContextMenu}
			onDrop={handleMove}
		/>

		{#if visibleAssets.length === 0}
			<div class="mt-20 flex flex-col items-center justify-center text-gray-500">
				<p class="mb-4 text-lg">This folder is empty</p>
			</div>
		{/if}
	</div>

	{#if contextMenu}
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			onClose={() => (contextMenu = null)}
			onRename={() => triggerRename(contextMenu!.assetId)}
			onDelete={() => handleDelete(contextMenu!.assetId)}
		/>
	{/if}
</div>
