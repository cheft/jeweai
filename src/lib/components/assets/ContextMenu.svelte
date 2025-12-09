<script lang="ts">
	import { onMount } from 'svelte';

	let { x, y, onRename, onDelete, onCopy, onCut, onPaste, canPaste, hasSelection, onClose } =
		$props<{
			x: number;
			y: number;
			onRename: () => void;
			onDelete: () => void;
			onCopy: () => void;
			onCut: () => void;
			onPaste: () => void;
			canPaste: boolean;
			hasSelection: boolean;
			onClose: () => void;
		}>();

	let menuEl: HTMLDivElement;

	function handleClickOutside(event: MouseEvent) {
		if (menuEl && !menuEl.contains(event.target as Node)) {
			onClose();
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

<div
	bind:this={menuEl}
	class="fixed z-[100] flex min-w-[200px] flex-col rounded-lg border border-white/10 bg-gray-900 shadow-xl backdrop-blur-md"
	style="top: {y}px; left: {x}px;"
	role="menu"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<ul class="py-1 text-sm text-gray-300">
		<li
			class="cursor-pointer px-4 py-2 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
			class:opacity-50={!hasSelection}
			onclick={() => {
				if (hasSelection) {
					onCopy();
					onClose();
				}
			}}
		>
			Copy
		</li>
		<li
			class="cursor-pointer px-4 py-2 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
			class:opacity-50={!hasSelection}
			onclick={() => {
				if (hasSelection) {
					onCut();
					onClose();
				}
			}}
		>
			Cut
		</li>
		<li
			class="cursor-pointer px-4 py-2 hover:bg-white/10 hover:text-white"
			class:opacity-50={!canPaste}
			onclick={() => {
				if (canPaste) {
					onPaste();
					onClose();
				}
			}}
		>
			Paste
		</li>

		<div class="my-1 h-px bg-white/10"></div>

		<li
			class="cursor-pointer px-4 py-2 hover:bg-white/10 hover:text-white"
			class:opacity-50={!hasSelection}
			onclick={() => {
				if (hasSelection) {
					onRename();
					onClose();
				}
			}}
		>
			Rename
		</li>
		<li
			class="cursor-pointer px-4 py-2 text-red-400 hover:bg-red-500 hover:text-white"
			class:opacity-50={!hasSelection}
			onclick={() => {
				if (hasSelection) {
					onDelete();
					onClose();
				}
			}}
		>
			Delete
		</li>
	</ul>
</div>
