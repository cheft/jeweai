<script lang="ts">
	import AssetsGrid from '$lib/components/assets/AssetsGrid.svelte';
	import ContextMenu from '$lib/components/assets/ContextMenu.svelte';
	import FileToolbar from '$lib/components/assets/FileToolbar.svelte';
	import type { Asset } from '$lib/types/assets';
	import { onMount } from 'svelte';

	// Icons
	import galleryRing from '$lib/assets/gallery-ring.png';
	import galleryNecklace from '$lib/assets/gallery-necklace.png';
	import galleryEarrings from '$lib/assets/gallery-earrings.png';
	import galleryBracelet from '$lib/assets/gallery-bracelet.png';
	import galleryPortrait1 from '$lib/assets/gallery-portrait-1.png';
	import galleryPortrait2 from '$lib/assets/gallery-portrait-2.png';

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
	let selectedIds = $state<string[]>([]);
	let renamingId = $state<string | null>(null);
	let clipboard = $state<{ op: 'copy' | 'cut'; items: Asset[] } | null>(null);
	let contextMenu = $state<{ x: number; y: number } | null>(null);

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
		selectedIds = [];
		renamingId = null;
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
		// Auto select and rename
		selectedIds = [newFolder.id];
		renamingId = newFolder.id;
	}

	function handleRenameSubmit(id: string, newName: string) {
		if (!newName.trim()) return; // Revert if empty? Or keep old? Let's keep old or just trim.
		const index = assets.findIndex((a) => a.id === id);
		if (index !== -1) {
			assets[index].name = newName;
		}
		renamingId = null;
	}

	function handleRenameCancel() {
		renamingId = null;
	}

	function handleDelete() {
		if (selectedIds.length === 0) return;

		const toDeleteIds = new Set<string>();

		function collect(targetId: string) {
			toDeleteIds.add(targetId);
			assets.filter((a) => a.parentId === targetId).forEach((child) => collect(child.id));
		}

		selectedIds.forEach((id) => collect(id));
		assets = assets.filter((a) => !toDeleteIds.has(a.id));
		selectedIds = [];
	}

	function handleCopy() {
		if (selectedIds.length === 0) return;
		const itemsToCopy = assets.filter((a) => selectedIds.includes(a.id));
		clipboard = { op: 'copy', items: itemsToCopy };
	}

	function handleCut() {
		if (selectedIds.length === 0) return;
		const itemsToCut = assets.filter((a) => selectedIds.includes(a.id));
		clipboard = { op: 'cut', items: itemsToCut };
	}

	function handlePaste() {
		if (!clipboard) return;

		if (clipboard.op === 'copy') {
			// Re-implemeting paste with recursion:
			const clones: Asset[] = [];
			const idMap = new Map<string, string>(); // Old ID -> New ID

			// First pass: Clone roots and map IDs
			clipboard.items.forEach((item) => {
				const newId = crypto.randomUUID();
				idMap.set(item.id, newId);
				clones.push({
					...item,
					id: newId,
					parentId: currentFolderId, // New parent is current view
					name: item.name, // Name conflict? Let's append Copy if same parent, but here we pasting probably in same folder or other.
					// If pasting in same folder, rename.
					createdAt: Date.now()
				});
			});

			// If any item was a folder, we need to find its children in the ORIGINAL assets list (if we can find them)
			// But wait, 'clipboard.items' only contains the selected items.
			// If we copy a folder, we expect its children to be copied too.
			// Current simplicity: Shallow copy references or we need to fetch children from global 'assets'

			// Recursive Copy Helper
			const deepCopy = (originalId: string, newParentId: string) => {
				const children = assets.filter((a) => a.parentId === originalId);
				children.forEach((child) => {
					const newChildId = crypto.randomUUID();
					clones.push({
						...child,
						id: newChildId,
						parentId: newParentId,
						createdAt: Date.now()
					});
					if (child.type === 'folder') {
						deepCopy(child.id, newChildId);
					}
				});
			};

			// Execute Deep Copy for each pasted item
			clipboard.items.forEach((item, idx) => {
				// Detect name collision in current folder
				let finalName = item.name;
				if (item.parentId === currentFolderId) {
					finalName = `${item.name} copy`; // Classic behavior
				}

				// Update root clone name
				const rootClone = clones[idx]; // It corresponds to items[idx]
				rootClone.name = finalName;

				if (item.type === 'folder') {
					deepCopy(item.id, rootClone.id);
				}
			});

			assets = [...assets, ...clones];
		} else if (clipboard.op === 'cut') {
			// Move items
			// Check for circular move
			const targetId = currentFolderId;
			let validMove = true;

			// We can't move a folder into itself or its children
			// Check each item
			for (const item of clipboard.items) {
				if (item.type === 'folder') {
					let check = targetId;
					while (check) {
						if (check === item.id) {
							validMove = false;
							break;
						}
						const p = assets.find((a) => a.id === check);
						check = p?.parentId || null;
					}
				}
				if (!validMove) break;
			}

			if (validMove) {
				assets = assets.map((a) => {
					if (clipboard!.items.some((c) => c.id === a.id)) {
						return { ...a, parentId: currentFolderId };
					}
					return a;
				});
				clipboard = null; // Clear clipboard after move
			} else {
				alert('Cannot move a folder into itself.');
			}
		}
	}

	function handleMove(draggedIds: string[], targetId: string | null) {
		// If targetId is provided, verify it exists and is a folder
		if (targetId) {
			const target = assets.find((a) => a.id === targetId);
			if (!target || target.type !== 'folder') return;
		}

		// Prevent circular
		for (const draggedId of draggedIds) {
			if (targetId && draggedId === targetId) continue; // Move to self? logic error in caller usually, but check

			let check: string | null = targetId;
			let isCircular = false;
			while (check) {
				if (check === draggedId) {
					isCircular = true;
					break;
				}
				const p = assets.find((a) => a.id === check);
				check = p?.parentId || null;
			}
			if (isCircular) return;
		}

		assets = assets.map((a) => {
			if (draggedIds.includes(a.id)) {
				return { ...a, parentId: targetId };
			}
			return a;
		});
		selectedIds = [];
	}

	function handleBreadcrumbDrop(e: DragEvent, targetId: string | null) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			try {
				const draggedIds = JSON.parse(data) as string[];
				handleMove(draggedIds, targetId);
			} catch (err) {
				console.error('Drop parse error', err);
			}
		}
	}

	// Context Menu Handlers
	function onContextMenu(e: MouseEvent, asset: Asset) {
		e.preventDefault();
		// If clicking outside selection, select just this one
		if (!selectedIds.includes(asset.id)) {
			selectedIds = [asset.id];
		}
		contextMenu = { x: e.clientX, y: e.clientY };
	}

	function onBackgroundContextMenu(e: MouseEvent) {
		// e.preventDefault();
		// Optional: Context menu for empty space (Paste, New Folder)
		// For now let's just use it to clear selection or ignore
	}
</script>

<div
	class="flex min-h-screen flex-col p-6"
	role="presentation"
	onclick={() => {
		// Clear selection if clicking background (AssetGrid handles its own background clicks too but this catches margins)
		// But check if we didn't click toolbar or something
		// Ideally handled by AssetGrid's container click
	}}
>
	<div class="container mx-auto flex flex-1 flex-col">
		<!-- Header & Breadcrumbs -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<!-- <h1 class="mb-2 text-3xl font-bold text-white">Assets</h1> -->
				<div class="flex items-center gap-2 text-sm text-gray-400">
					<!-- Home Breadcrumb -->
					<button
						class="rounded px-2 py-1 transition-colors hover:bg-white/10 hover:text-seko-accent"
						onclick={() => handleNavigate(null)}
						ondragover={(e) => e.preventDefault()}
						ondrop={(e) => handleBreadcrumbDrop(e, null)}
					>
						Home
					</button>
					{#each currentPath as folder}
						<span class="text-gray-600">/</span>
						<button
							class="rounded px-2 py-1 transition-colors hover:bg-white/10 hover:text-seko-accent"
							onclick={() => handleNavigate(folder.id)}
							ondragover={(e) => e.preventDefault()}
							ondrop={(e) => handleBreadcrumbDrop(e, folder.id)}
						>
							{folder.name}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Toolbar -->
		<FileToolbar
			canPaste={!!clipboard}
			hasSelection={selectedIds.length > 0}
			onCreateFolder={handleCreateFolder}
			onCopy={handleCopy}
			onCut={handleCut}
			onPaste={handlePaste}
			onDelete={handleDelete}
			onRename={() => {
				if (selectedIds.length === 1) renamingId = selectedIds[0];
			}}
		/>

		<!-- Grid -->
		<AssetsGrid
			items={visibleAssets}
			{selectedIds}
			{renamingId}
			onSelect={(ids) => (selectedIds = ids)}
			onDblClick={(asset) => {
				if (asset.type === 'folder') handleNavigate(asset.id);
			}}
			{onContextMenu}
			onDrop={handleMove}
			onRenameSubmit={handleRenameSubmit}
			onRenameCancel={handleRenameCancel}
		/>

		{#if visibleAssets.length === 0}
			<div class="mt-20 flex flex-col items-center justify-center text-gray-500">
				<p class="mb-4 text-lg">Empty folder</p>
			</div>
		{/if}
	</div>

	{#if contextMenu}
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			onClose={() => (contextMenu = null)}
			onRename={() => {
				if (selectedIds.length === 1) renamingId = selectedIds[0];
			}}
			onDelete={handleDelete}
			onCopy={handleCopy}
			onCut={handleCut}
			onPaste={handlePaste}
			canPaste={!!clipboard}
			hasSelection={selectedIds.length > 0}
		/>
	{/if}
</div>
