<script lang="ts">
	import AssetsGrid from '$lib/components/assets/AssetsGrid.svelte';
	import ContextMenu from '$lib/components/assets/ContextMenu.svelte';
	import FileToolbar from '$lib/components/assets/FileToolbar.svelte';
	import AssetDetailModal from '$lib/components/assets/AssetDetailModal.svelte';
	import type { Asset } from '$lib/types/assets';
	import { onMount } from 'svelte';
	import { client } from '$lib/orpc';
	import { goto } from '$app/navigation';
	import JSZip from 'jszip';

	// State
	let assets = $state<Asset[]>([]);
	let folders = $state<Asset[]>([]);
	let isLoading = $state(true);
	let currentFolderId = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let renamingId = $state<string | null>(null);
	let renamingOriginalName = $state<string>(''); // Store original name for cancel
	let isRenamingInProgress = $state(false); // Prevent duplicate submissions
	let clipboard = $state<{ op: 'copy' | 'cut'; items: Asset[] } | null>(null);
	let contextMenu = $state<{ x: number; y: number } | null>(null);
	let detailModalAssetId = $state<string | null>(null);
	let dragOverBreadcrumbId = $state<string | null>(null);

	// Derived
	let visibleAssets = $derived(
		[...folders, ...assets].filter((a) => {
			if (currentFolderId === null) {
				return a.folderId === null || a.folderId === undefined;
			}
			return a.folderId === currentFolderId;
		})
	);
	let currentPath = $state<Asset[]>([]);

	async function buildPath(folderId: string | null): Promise<Asset[]> {
		if (!folderId) {
			currentPath = [];
			return [];
		}
		
		try {
			// Get folder from API to ensure we have the latest data
			const folder = await client.assets.getFolder({ id: folderId });
			const parentPath = await buildPath(folder.parentId || null);
			const fullPath = [...parentPath, {
				id: folder.id,
				parentId: folder.parentId,
				folderId: folder.parentId,
				name: folder.name,
				type: 'folder' as const,
				createdAt: folder.createdAt,
				updatedAt: folder.updatedAt,
			}];
			currentPath = fullPath;
			return fullPath;
		} catch (err) {
			console.error('Failed to build path:', err);
			currentPath = [];
			return [];
		}
	}

	// Load data
	async function loadAssets() {
		isLoading = true;
		try {
			const allItems = await client.assets.list({ folderId: currentFolderId, includeFolders: true });
			// Separate folders and assets
			const items = allItems.map((item) => ({
				...item,
				parentId: item.folderId || null,
				thumbnail: item.coverUrl || undefined,
			}));
			assets = items.filter((a) => a.type !== 'folder');
			folders = items.filter((a) => a.type === 'folder');
		} catch (err: any) {
			console.error('Failed to load assets:', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		await buildPath(currentFolderId);
		await loadAssets();
	});

	// Actions
	async function handleNavigate(folderId: string | null) {
		currentFolderId = folderId;
		selectedIds = [];
		renamingId = null;
		renamingOriginalName = '';
		contextMenu = null;
		await buildPath(folderId);
		await loadAssets();
	}

	async function handleCreateFolder() {
		try {
			const result = await client.assets.createFolder({ 
				name: 'New Folder',
				parentId: currentFolderId 
			});
			// Update local state instead of full reload to avoid loading spinner
			const newFolder: Asset = {
				id: result.id,
				parentId: result.parentId,
				folderId: result.parentId,
				name: result.name,
				type: 'folder',
				createdAt: result.createdAt,
				updatedAt: result.updatedAt,
			};
			folders = [...folders, newFolder];
			
			selectedIds = [result.id];
			renamingId = result.id;
			renamingOriginalName = 'New Folder';
		} catch (err: any) {
			console.error('Failed to create folder:', err);
			alert('Failed to create folder: ' + (err.message || 'Unknown error'));
		}
	}

	async function handleRenameSubmit(id: string, newName: string) {
		// Prevent duplicate submissions
		if (isRenamingInProgress) return;
		
		if (!newName.trim()) {
			// If empty, cancel rename
			handleRenameCancel();
			return;
		}
		
		// Check if locked
		const item = assets.find((a) => a.id === id) || folders.find((a) => a.id === id);
		if (item && item.status === 'locked') {
			alert('Cannot rename locked assets');
			renamingId = null;
			renamingOriginalName = '';
			return;
		}

		// Check if name actually changed
		if (newName.trim() === renamingOriginalName) {
			// No change, just cancel
			handleRenameCancel();
			return;
		}

		isRenamingInProgress = true;
		isLoading = true;
		try {
			if (item?.type === 'folder') {
				await client.assets.updateFolder({ id, name: newName.trim() });
			} else {
				await client.assets.update({ id, name: newName.trim() });
			}
			await loadAssets();
		} catch (err: any) {
			console.error('Failed to rename:', err);
			alert('Failed to rename: ' + (err.message || 'Unknown error'));
			isLoading = false;
		} finally {
			isRenamingInProgress = false;
			renamingId = null;
			renamingOriginalName = '';
		}
	}

	function handleRenameCancel() {
		renamingId = null;
		renamingOriginalName = '';
		isRenamingInProgress = false;
	}

	async function handleDelete() {
		if (selectedIds.length === 0) return;

		// Check if any selected asset is locked
		const selectedItems = [...assets, ...folders].filter((a) => selectedIds.includes(a.id));
		const lockedItems = selectedItems.filter((a) => a.status === 'locked');
		if (lockedItems.length > 0) {
			alert('Cannot delete locked assets');
			return;
		}

		if (!confirm(`Delete ${selectedIds.length} item(s)? This will also delete all contents if deleting folders.`)) return;

		isLoading = true;
		try {
			for (const id of selectedIds) {
				const item = assets.find((a) => a.id === id) || folders.find((a) => a.id === id);
				if (item) {
					if (item.type === 'folder') {
						await client.assets.deleteFolder({ id });
					} else {
						await client.assets.delete({ id });
					}
				}
			}
			await loadAssets();
			selectedIds = [];
		} catch (err: any) {
			console.error('Failed to delete:', err);
			alert('Failed to delete: ' + (err.message || 'Unknown error'));
			isLoading = false;
		}
	}

	function handleCopy() {
		if (selectedIds.length === 0) return;
		const itemsToCopy = [...assets, ...folders].filter((a) => selectedIds.includes(a.id));
		clipboard = { op: 'copy', items: itemsToCopy };
	}

	function handleCut() {
		if (selectedIds.length === 0) return;
		const itemsToCut = [...assets, ...folders].filter((a) => selectedIds.includes(a.id));
		
		// Check if any item is locked
		const lockedItems = itemsToCut.filter((a) => a.status === 'locked');
		if (lockedItems.length > 0) {
			alert('Cannot cut locked assets');
			return;
		}

		clipboard = { op: 'cut', items: itemsToCut };
	}

	// Helper function to add "copy" before file extension
	function addCopySuffix(name: string): string {
		const lastDotIndex = name.lastIndexOf('.');
		if (lastDotIndex > 0) {
			// Has extension: insert " copy" before the extension
			const nameWithoutExt = name.substring(0, lastDotIndex);
			const ext = name.substring(lastDotIndex);
			return `${nameWithoutExt} copy${ext}`;
		} else {
			// No extension (like folders): append " copy"
			return `${name} copy`;
		}
	}

	async function handlePaste() {
		if (!clipboard) return;

		isLoading = true;

		if (clipboard.op === 'copy') {
			// Copy operation - create duplicates
			try {
				for (const item of clipboard.items) {
					if (item.type === 'folder') {
						// For folders, create new folder with copy suffix
						const newFolderName = addCopySuffix(item.name);
						const newFolder = await client.assets.createFolder({
							name: newFolderName,
							parentId: currentFolderId
						});
						// TODO: Recursively copy folder contents
					} else {
						// Copy asset (including R2 files) - server handles the name correctly
						await client.assets.copy({
							id: item.id,
							folderId: currentFolderId
						});
					}
				}
				await loadAssets();
			} catch (err: any) {
				console.error('Failed to copy:', err);
				alert('Failed to copy: ' + (err.message || 'Unknown error'));
				isLoading = false;
			}
		} else if (clipboard.op === 'cut') {
			// Move operation
			try {
				for (const item of clipboard.items) {
					if (item.type === 'folder') {
						await client.assets.updateFolder({
							id: item.id,
							parentId: currentFolderId
						});
					} else {
						await client.assets.update({
							id: item.id,
							folderId: currentFolderId
						});
					}
				}
				await loadAssets();
				clipboard = null;
			} catch (err: any) {
				console.error('Failed to move:', err);
				alert('Failed to move: ' + (err.message || 'Unknown error'));
				isLoading = false;
			}
		}
	}

	async function handleMove(draggedIds: string[], targetId: string | null) {
		// Check if any dragged item is locked
		const draggedItems = [...assets, ...folders].filter((a) => draggedIds.includes(a.id));
		const lockedItems = draggedItems.filter((a) => a.status === 'locked');
		if (lockedItems.length > 0) {
			alert('Cannot move locked assets');
			return;
		}

		if (targetId) {
			const target = folders.find((a) => a.id === targetId);
			if (!target || target.type !== 'folder') return;
		}

		// Prevent circular
		for (const draggedId of draggedIds) {
			if (targetId && draggedId === targetId) continue;
			let check: string | null = targetId;
			let isCircular = false;
			while (check) {
				if (check === draggedId) {
					isCircular = true;
					break;
				}
				const p = folders.find((a) => a.id === check);
				check = p?.folderId || null;
			}
			if (isCircular) return;
		}

		isLoading = true;

		try {
			for (const id of draggedIds) {
				const item = assets.find((a) => a.id === id) || folders.find((a) => a.id === id);
				if (item) {
					if (item.type === 'folder') {
						await client.assets.updateFolder({
							id,
							parentId: targetId
						});
					} else {
						await client.assets.update({
							id,
							folderId: targetId
						});
					}
				}
			}
			await loadAssets();
			selectedIds = [];
		} catch (err: any) {
			console.error('Failed to move:', err);
			alert('Failed to move: ' + (err.message || 'Unknown error'));
			isLoading = false;
		}
	}

	function handleBreadcrumbDrop(e: DragEvent, targetId: string | null) {
		e.preventDefault();
		dragOverBreadcrumbId = null;
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
		if (!selectedIds.includes(asset.id)) {
			selectedIds = [asset.id];
		}
		contextMenu = { x: e.clientX, y: e.clientY };
	}

	function onBackgroundContextMenu(e: MouseEvent) {
		// Optional: Context menu for empty space
	}

	function handleDblClick(asset: Asset) {
		if (asset.type === 'folder') {
			handleNavigate(asset.id);
		} else {
			// Open detail modal
			detailModalAssetId = asset.id;
		}
	}

	// Helper to recursively collect files
	async function collectDownloadItems(items: Asset[]): Promise<Asset[]> {
		let collected: Asset[] = [];
		let queue = [...items];

		// Safety break to prevent infinite loops or massive downloads
		let iterations = 0;
		const MAX_ITERATIONS = 100;

		while (queue.length > 0) {
			iterations++;
			if (iterations > MAX_ITERATIONS) break;

			const item = queue.shift()!;
			
			// Check limit before fetching more
			if (collected.length > 10) {
				throw new Error('一次最多下载10个文件');
			}

			if (item.type === 'folder') {
				// Fetch children
				const children = await client.assets.list({ folderId: item.id, includeFolders: true });
				const childrenTyped: Asset[] = children.map((c) => ({
					...c,
					parentId: c.folderId || null,
					thumbnail: c.coverUrl || undefined
				}));
				queue.push(...childrenTyped);
			} else {
				collected.push(item);
			}
		}

		if (collected.length > 10) {
			throw new Error('一次最多下载10个文件');
		}

		return collected;
	}

	async function handleDownload() {
		if (selectedIds.length === 0) return;
		
		const initialItems = [...assets, ...folders].filter((a) => selectedIds.includes(a.id));
		const isZip = initialItems.some((i) => i.type === 'folder') || initialItems.length > 1;

		isLoading = true;
		try {
			const filesToDownload = await collectDownloadItems(initialItems);

			if (filesToDownload.length === 0) {
				alert('没有可下载的文件');
				return;
			}

			if (!isZip && filesToDownload.length === 1) {
				// Single file direct download via proxy
				// This handles Content-Disposition: attachment to force download
				const file = filesToDownload[0];
				
				// Create a hidden iframe or link click to trigger download without replacing page
				const url = `/api/download/${file.id}`;
				const a = document.createElement('a');
				a.href = url;
				a.download = file.name; // Browser fallback
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			} else {
				// Zip download
				const zip = new JSZip();
				
				// Fetch files sequentially to avoid browser limits or server issues
				for (const file of filesToDownload) {
					try {
						const url = `/api/download/${file.id}`;
						const response = await fetch(url);
						if (!response.ok) {
							console.error(`Failed to fetch ${file.name}: ${response.status}`);
							continue;
						}
						const blob = await response.blob();
						zip.file(file.name, blob);
					} catch (fetchErr) {
						console.error(`Error fetching ${file.name}:`, fetchErr);
					}
				}

				const content = await zip.generateAsync({ type: 'blob' });
				const zipName = initialItems.length === 1 ? `${initialItems[0].name}.zip` : 'download.zip';
				
				const a = document.createElement('a');
				a.href = URL.createObjectURL(content);
				a.download = zipName;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(a.href);
			}
		} catch (err: any) {
			console.error('Download failed:', err);
			alert('下载失败: ' + (err.message || '未知错误'));
		} finally {
			isLoading = false;
		}
	}

	function handleAIGenerate() {
		if (selectedIds.length !== 1) return;
		// Determine if it is a valid image asset
		const item = [...assets, ...folders].find((a) => a.id === selectedIds[0]);
		
		if (item && item.type === 'image') {
			goto(`/gallery?assetId=${item.id}`);
		}
	}


	// Check if any selected item is locked
	let hasLockedSelection = $derived(
		selectedIds.some((id) => {
			const item = [...assets, ...folders].find((a) => a.id === id);
			return item?.status === 'locked';
		})
	);

	// Check if exactly one image is selected
	let hasSingleImage = $derived(
		selectedIds.length === 1 &&
		(() => {
			const item = [...assets, ...folders].find((a) => a.id === selectedIds[0]);
			return item?.type === 'image';
		})()
	);
</script>

<div
	class="flex min-h-screen flex-col p-6"
	role="presentation"
>
	<div class="container mx-auto flex flex-1 flex-col">
		<!-- Header & Breadcrumbs -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<div class="flex items-center gap-2 text-sm text-gray-400">
					<!-- Home Breadcrumb -->
					<button
						class="rounded px-2 py-1 transition-all duration-200 hover:bg-white/10 hover:text-seko-accent {dragOverBreadcrumbId ===
						'root'
							? 'scale-110 bg-seko-accent text-black shadow-[0_0_15px_rgba(163,230,53,0.5)] ring-2 ring-white/50'
							: ''}"
						onclick={() => handleNavigate(null)}
						ondragover={(e) => {
							e.preventDefault();
							if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
							dragOverBreadcrumbId = 'root';
						}}
						ondragleave={() => (dragOverBreadcrumbId = null)}
						ondrop={(e) => handleBreadcrumbDrop(e, null)}
					>
						Home
					</button>
					{#each currentPath as folder}
						<span class="text-gray-600">/</span>
						<button
							class="rounded px-2 py-1 transition-all duration-200 hover:bg-white/10 hover:text-seko-accent {dragOverBreadcrumbId ===
							folder.id
								? 'scale-110 bg-seko-accent text-black shadow-[0_0_15px_rgba(163,230,53,0.5)] ring-2 ring-white/50'
								: ''}"
							onclick={() => handleNavigate(folder.id)}
							ondragover={(e) => {
								e.preventDefault();
								if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
								dragOverBreadcrumbId = folder.id;
							}}
							ondragleave={() => (dragOverBreadcrumbId = null)}
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
			hasSelection={selectedIds.length > 0 && !hasLockedSelection}
			hasSingleImage={hasSingleImage}
			onCreateFolder={handleCreateFolder}
			onCopy={handleCopy}
			onCut={handleCut}
			onPaste={handlePaste}
			onDelete={handleDelete}
			onDownload={handleDownload}
			onAIGenerate={handleAIGenerate}
			onRename={() => {
				if (selectedIds.length === 1 && !hasLockedSelection) {
					const item = [...assets, ...folders].find((a) => a.id === selectedIds[0]);
					if (item) {
						renamingId = selectedIds[0];
						renamingOriginalName = item.name || '';
					}
				}
			}}
		/>

		<!-- Grid -->
		{#if isLoading}
			<div class="flex items-center justify-center py-20">
				<div
					class="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-seko-accent"
				></div>
			</div>
		{:else}
			<AssetsGrid
				items={visibleAssets}
				{selectedIds}
				{renamingId}
				onSelect={(ids) => (selectedIds = ids)}
				onDblClick={handleDblClick}
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
		{/if}
	</div>

	{#if contextMenu}
		{@const selectedAsset = [...assets, ...folders].find((a) => selectedIds[0] === a.id)}
		{@const isLocked = selectedAsset?.status === 'locked'}
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			onClose={() => (contextMenu = null)}
			onRename={() => {
				if (selectedIds.length === 1 && !isLocked) {
					const item = [...assets, ...folders].find((a) => a.id === selectedIds[0]);
					if (item) {
						renamingId = selectedIds[0];
						renamingOriginalName = item.name || '';
					}
				}
			}}
			onDelete={handleDelete}
			onCopy={handleCopy}
			onCut={handleCut}
			onPaste={handlePaste}
			canPaste={!!clipboard}
			hasSelection={selectedIds.length > 0 && !isLocked}
			canCopy={selectedIds.length > 0}
		/>
	{/if}

	{#if detailModalAssetId}
		<AssetDetailModal assetId={detailModalAssetId} onClose={() => (detailModalAssetId = null)} />
	{/if}
</div>
