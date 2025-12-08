<script lang="ts">
	import type { Asset } from '$lib/types/assets';
	import AssetCard from './AssetCard.svelte';

	let { items, onSelect, onDblClick, onContextMenu, onDrop } = $props<{
		items: Asset[];
		onSelect: (asset: Asset) => void;
		onDblClick: (asset: Asset) => void;
		onContextMenu: (e: MouseEvent, asset: Asset) => void;
		onDrop: (draggedId: string, targetId: string) => void;
	}>();

	let selectedId = $state<string | null>(null);

	function handleDragStart(e: DragEvent, asset: Asset) {
		if (e.dataTransfer) {
			e.dataTransfer.setData('text/plain', asset.id);
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDrop(e: DragEvent, targetAsset: Asset) {
		e.preventDefault();
		e.stopPropagation(); // Stop propagation to avoid double drops if nested
		const draggedId = e.dataTransfer?.getData('text/plain');
		if (draggedId && draggedId !== targetAsset.id) {
			onDrop(draggedId, targetAsset.id);
		}
	}
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
	{#each items as asset (asset.id)}
		<AssetCard
			{asset}
			selected={selectedId === asset.id}
			onselect={() => {
				selectedId = asset.id;
				onSelect(asset);
			}}
			ondblclick={() => onDblClick(asset)}
			oncontextmenu={(e) => onContextMenu(e, asset)}
			ondragstart={(e) => handleDragStart(e, asset)}
			ondrop={(e) => handleDrop(e, asset)}
		/>
	{/each}
</div>
