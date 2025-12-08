<script lang="ts">
	import type { Asset } from '$lib/types/assets';

	let {
		asset,
		selected = false,
		onselect,
		ondblclick,
		oncontextmenu,
		ondragstart,
		ondrop,
		ondragover
	} = $props<{
		asset: Asset;
		selected?: boolean;
		onselect?: () => void;
		ondblclick?: () => void;
		oncontextmenu?: (e: MouseEvent) => void;
		ondragstart?: (e: DragEvent) => void;
		ondrop?: (e: DragEvent) => void;
		ondragover?: (e: DragEvent) => void;
	}>();

	let isDragOver = $state(false);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (asset.type === 'folder') {
			isDragOver = true;
			ondragover?.(e);
		}
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (asset.type === 'folder') {
			ondrop?.(e);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200
    {selected ? 'bg-white/10 ring-2 ring-seko-accent' : 'hover:bg-white/5'}
    {isDragOver ? 'scale-105 bg-white/10 ring-2 ring-seko-accent' : ''}"
	onclick={onselect}
	{ondblclick}
	{oncontextmenu}
	draggable="true"
	{ondragstart}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div
		class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800"
	>
		{#if asset.type === 'folder'}
			<!-- Folder Icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="h-16 w-16 text-seko-accent transition-transform duration-300 group-hover:scale-110"
			>
				<path
					d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"
				/>
			</svg>
		{:else}
			<!-- Video Thumbnail/Icon -->
			{#if asset.thumbnail}
				<img
					src={asset.thumbnail}
					alt={asset.name}
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
				/>
				<!-- Play Icon Overlay -->
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-8 w-8 text-white drop-shadow-lg"
					>
						<path
							fill-rule="evenodd"
							d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="h-16 w-16 text-gray-400 transition-colors group-hover:text-white"
				>
					<path
						d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z"
					/>
				</svg>
			{/if}
			{#if asset.duration}
				<div
					class="absolute right-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
				>
					{asset.duration}
				</div>
			{/if}
		{/if}
	</div>
	<div class="w-full text-center">
		<p class="truncate text-xs font-medium text-gray-300 group-hover:text-white">
			{asset.name}
		</p>
	</div>
</div>
