<script lang="ts">
	import type { Asset } from '$lib/types/assets';
	import AssetCard from './AssetCard.svelte';

	let {
		items,
		selectedIds = [],
		renamingId = null,
		onSelect,
		onDblClick,
		onContextMenu,
		onDrop,
		onRenameSubmit,
		onRenameCancel
	} = $props<{
		items: Asset[];
		selectedIds: string[];
		renamingId: string | null;
		onSelect: (ids: string[]) => void;
		onDblClick: (asset: Asset) => void;
		onContextMenu: (e: MouseEvent, asset: Asset) => void;
		onDrop: (draggedIds: string[], targetId: string) => void;
		onRenameSubmit: (id: string, newName: string) => void;
		onRenameCancel: () => void;
	}>();

	let containerRef: HTMLDivElement;
	let selectionBox = $state<{
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
		visible: boolean;
	}>({ startX: 0, startY: 0, currentX: 0, currentY: 0, visible: false });

	let isDraggingSelection = $state(false);

	// Multi-select Logic
	function handleCardClick(e: MouseEvent, asset: Asset) {
		e.stopPropagation(); // Prevent container click

		let newSelection: string[];

		if (e.ctrlKey || e.metaKey) {
			// Toggle
			if (selectedIds.includes(asset.id)) {
				newSelection = selectedIds.filter((id) => id !== asset.id);
			} else {
				newSelection = [...selectedIds, asset.id];
			}
		} else if (e.shiftKey && selectedIds.length > 0) {
			// Range (simplified: selects between last selected and current index)
			// A true range select needs the index in the current sorted view
			const lastId = selectedIds[selectedIds.length - 1];
			const lastIndex = items.findIndex((i: Asset) => i.id === lastId);
			const currentIndex = items.findIndex((i: Asset) => i.id === asset.id);

			if (lastIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastIndex, currentIndex);
				const end = Math.max(lastIndex, currentIndex);
				const rangeIds = items.slice(start, end + 1).map((i: Asset) => i.id);
				// Merge uniqueness
				newSelection = Array.from(new Set([...selectedIds, ...rangeIds]));
			} else {
				newSelection = [asset.id];
			}
		} else {
			// Single select
			newSelection = [asset.id];
		}

		onSelect(newSelection);
	}

	function handleContainerMouseDown(e: MouseEvent) {
		if (e.button !== 0) return; // Only left click
		if ((e.target as HTMLElement).closest('.asset-card')) return; // handled by card

		// Start drag selection
		isDraggingSelection = true;
		const rect = containerRef.getBoundingClientRect();
		// Relative to container or viewport?
		// Selection box is usually fixed or absolute relative to body/viewport to cover everything.
		// Let's use viewport coordinates.
		selectionBox = {
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
			visible: true
		};

		// Clear selection if not modified
		if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
			onSelect([]);
		}

		window.addEventListener('mousemove', handleWindowMouseMove);
		window.addEventListener('mouseup', handleWindowMouseUp);
	}

	function handleWindowMouseMove(e: MouseEvent) {
		if (!isDraggingSelection) return;
		selectionBox.currentX = e.clientX;
		selectionBox.currentY = e.clientY;

		// Calculate intersection (Throttled or every frame? Every frame is fine for modern browsers)
		updateSelectionFromBox(e.ctrlKey || e.metaKey);
	}

	function handleWindowMouseUp() {
		isDraggingSelection = false;
		selectionBox.visible = false;
		window.removeEventListener('mousemove', handleWindowMouseMove);
		window.removeEventListener('mouseup', handleWindowMouseUp);
	}

	function updateSelectionFromBox(additive: boolean) {
		// Calculate box rect
		const boxLeft = Math.min(selectionBox.startX, selectionBox.currentX);
		const boxTop = Math.min(selectionBox.startY, selectionBox.currentY);
		const boxWidth = Math.abs(selectionBox.currentX - selectionBox.startX);
		const boxHeight = Math.abs(selectionBox.currentY - selectionBox.startY);

		// If box is too small, ignore (regular click)
		if (boxWidth < 5 && boxHeight < 5) return;

		const cardElements = containerRef.querySelectorAll('.asset-card');
		const newSelected = additive ? new Set(selectedIds) : new Set<string>();

		cardElements.forEach((el) => {
			const rect = el.getBoundingClientRect();
			// Check overlap
			const overlap = !(
				rect.right < boxLeft ||
				rect.left > boxLeft + boxWidth ||
				rect.bottom < boxTop ||
				rect.top > boxTop + boxHeight
			);

			const id = el.getAttribute('data-id');
			if (id && overlap) {
				newSelected.add(id);
			} else if (id && !additive && !overlap) {
				// In non-additive mode, we clear if not overlapping (already handled by new Set())
			}
		});

		onSelect(Array.from(newSelected));
	}

	function handleDragStart(e: DragEvent, asset: Asset) {
		if (e.dataTransfer) {
			// If dragging an item that is NOT in the selection, select it solely
			let dragIds = selectedIds;
			if (!selectedIds.includes(asset.id)) {
				dragIds = [asset.id];
				onSelect(dragIds);
			}

			e.dataTransfer.setData('application/json', JSON.stringify(dragIds));
			e.dataTransfer.effectAllowed = 'move';

			// Visual drag image? Browser default stack is okay for now.
		}
	}

	function handleDrop(e: DragEvent, targetAsset: Asset) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			try {
				const draggedIds = JSON.parse(data) as string[];
				// Don't drop on itself or if target is one of the dragged items
				if (!draggedIds.includes(targetAsset.id)) {
					onDrop(draggedIds, targetAsset.id);
				}
			} catch (err) {
				// fallback for single item legacy drag if needed, currently we control dragstart so JSON is safe
				console.error('Drop parse error', err);
			}
		}
	}
</script>

<div
	bind:this={containerRef}
	class="relative min-h-[500px] w-full"
	role="region"
	aria-label="File Grid"
	onmousedown={handleContainerMouseDown}
>
	<div
		class="grid grid-cols-2 gap-4 pb-10 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9"
	>
		{#each items as asset (asset.id)}
			<div class="asset-card" data-id={asset.id}>
				<AssetCard
					{asset}
					selected={selectedIds.includes(asset.id)}
					renaming={renamingId === asset.id}
					onselect={(e) => handleCardClick(e, asset)}
					ondblclick={() => onDblClick(asset)}
					oncontextmenu={(e) => onContextMenu(e, asset)}
					ondragstart={(e) => handleDragStart(e, asset)}
					ondrop={(e) => handleDrop(e, asset)}
					onRenameSubmit={(newName) => onRenameSubmit(asset.id, newName)}
					{onRenameCancel}
				/>
			</div>
		{/each}
	</div>

	<!-- Selection Box Overlay -->
	{#if selectionBox.visible}
		<div
			class="fixed z-50 border border-seko-accent bg-seko-accent/20"
			style="
				left: {Math.min(selectionBox.startX, selectionBox.currentX)}px;
				top: {Math.min(selectionBox.startY, selectionBox.currentY)}px;
				width: {Math.abs(selectionBox.currentX - selectionBox.startX)}px;
				height: {Math.abs(selectionBox.currentY - selectionBox.startY)}px;
				pointer-events: none;
			"
		></div>
	{/if}
</div>
