<script lang="ts">
	import type { Asset } from '$lib/types/assets';

	let {
		asset,
		selected = false,
		renaming = false,
		onselect,
		ondblclick,
		oncontextmenu,
		ondragstart,
		ondrop,
		ondragover,
		onRenameSubmit,
		onRenameCancel
	} = $props<{
		asset: Asset;
		selected?: boolean;
		renaming?: boolean;
		onselect?: (e: MouseEvent) => void;
		ondblclick?: (e: MouseEvent) => void;
		oncontextmenu?: (e: MouseEvent) => void;
		ondragstart?: (e: DragEvent) => void;
		ondrop?: (e: DragEvent) => void;
		ondragover?: (e: DragEvent) => void;
		onRenameSubmit?: (newName: string) => void;
		onRenameCancel?: () => void;
	}>();

	let isDragging = $state(false);
	let isDragOver = $state(false);
	let renameInputRef: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (asset.type === 'folder') {
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
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

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onRenameSubmit?.(renameInputRef.value);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onRenameCancel?.();
		}
	}

	$effect(() => {
		if (renaming && renameInputRef) {
			renameInputRef.focus();
			renameInputRef.select();
		}
	});

	function handleClick(e: MouseEvent) {
		if (renaming) {
			e.stopPropagation(); // Don't trigger select when clicking input
		} else {
			onselect?.(e);
		}
	}

	function handleDragStart(e: DragEvent) {
		if (asset.status === 'locked') {
			e.preventDefault();
			return;
		}
		isDragging = true;
		ondragstart?.(e);
	}

	function handleDragEnd() {
		isDragging = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200
    {selected ? 'bg-seko-accent/20 ring-2 ring-seko-accent' : 'hover:bg-white/5'}
    {isDragOver ? 'scale-105 bg-white/10 ring-2 ring-seko-accent' : ''}
	{isDragging ? 'opacity-20' : ''}"
	onclick={handleClick}
	{ondblclick}
	{oncontextmenu}
	draggable={!renaming && asset.status !== 'locked'}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div
		class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800 shadow-inner"
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
			<!-- Video/Image Thumbnail/Icon -->
			{#if asset.thumbnail || asset.coverUrl}
				<img
					src={asset.thumbnail || asset.coverUrl}
					alt={asset.name}
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
				/>
				<!-- Play Icon Overlay for videos -->
				{#if asset.type === 'video'}
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
				{/if}
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="h-16 w-16 text-gray-400 transition-colors group-hover:text-white"
				>
					{#if asset.type === 'image'}
						<path
							fill-rule="evenodd"
							d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.061l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
							clip-rule="evenodd"
						/>
					{:else}
						<path
							d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z"
						/>
					{/if}
				</svg>
			{/if}
			{#if asset.duration}
				<div
					class="absolute right-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
				>
					{asset.duration}
				</div>
			{/if}
			<!-- Lock Icon for locked assets -->
			{#if asset.status === 'locked'}
				<div
					class="absolute right-1 top-1 flex items-center justify-center rounded-full bg-yellow-500/90 p-1.5"
					title="Locked - in use"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-3 w-3 text-black"
					>
						<path
							fill-rule="evenodd"
							d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		{/if}
	</div>
	<div class="w-full text-center">
		{#if renaming}
			<input
				bind:this={renameInputRef}
				value={asset.name}
				class="w-full rounded border border-seko-accent bg-black/50 p-0.5 px-1 text-center text-xs text-white outline-none focus:ring-1 focus:ring-seko-accent"
				onkeydown={handleKeyDown}
				onclick={(e) => e.stopPropagation()}
				onblur={() => onRenameSubmit?.(renameInputRef.value)}
			/>
		{:else}
			<p class="truncate text-xs font-medium text-gray-300 group-hover:text-white">
				{asset.name}
			</p>
		{/if}
	</div>
</div>
