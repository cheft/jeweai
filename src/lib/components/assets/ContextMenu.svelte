<script lang="ts">
	import { onMount } from 'svelte';

	let { x, y, onRename, onDelete, onClose } = $props<{
		x: number;
		y: number;
		onRename: () => void;
		onDelete: () => void;
		onClose: () => void;
	}>();

	let menuEl: HTMLDivElement;

	function handleClickOutside(event: MouseEvent) {
		if (menuEl && !menuEl.contains(event.target as Node)) {
			onClose();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div
	bind:this={menuEl}
	class="fixed z-50 min-w-[160px] rounded-lg border border-white/10 bg-gray-900 shadow-xl backdrop-blur-md"
	style="top: {y}px; left: {x}px;"
	role="menu"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<ul class="py-1 text-sm text-gray-300">
		<li
			class="cursor-pointer px-4 py-2 transition-colors hover:bg-seko-accent hover:text-black"
			onclick={() => {
				onRename();
				onClose();
			}}
			role="menuitem"
		>
			Rename
		</li>
		<li
			class="cursor-pointer px-4 py-2 text-red-400 transition-colors hover:bg-red-500 hover:text-white"
			onclick={() => {
				onDelete();
				onClose();
			}}
			role="menuitem"
		>
			Delete
		</li>
	</ul>
</div>
