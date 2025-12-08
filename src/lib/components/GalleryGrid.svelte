<script lang="ts">
	import { fade } from 'svelte/transition';

	interface GalleryItem {
		id: string;
		thumbnail: string;
		videoUrl?: string;
		title: string;
		duration: string;
		isPortrait?: boolean;
	}

	let { items } = $props<{ items: GalleryItem[] }>();
	let hoveredId = $state<string | null>(null);

	function handleMouseEnter(id: string) {
		hoveredId = id;
	}

	function handleMouseLeave() {
		hoveredId = null;
	}
</script>

<div class="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-5">
	{#each items as item}
		<div
			class="group relative mb-6 cursor-pointer break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-gray-900 transition-transform hover:scale-[1.02] hover:border-seko-accent/30 hover:shadow-2xl hover:shadow-seko-accent/10"
			style="aspect-ratio: {item.isPortrait ? '9/16' : '16/9'};"
			onmouseenter={() => handleMouseEnter(item.id)}
			onmouseleave={handleMouseLeave}
			role="button"
			tabindex="0"
		>
			<!-- Thumbnail Image -->
			<img
				src={item.thumbnail}
				alt={item.title}
				class="h-full w-full object-cover transition-opacity duration-500 {hoveredId === item.id
					? 'opacity-0'
					: 'opacity-100'}"
			/>

			<!-- "Video" State -->
			<div
				class="absolute inset-0 flex items-center justify-center bg-black transition-opacity duration-300 {hoveredId ===
				item.id
					? 'opacity-100'
					: 'opacity-0'}"
			>
				<!-- Simulated video playback visual -->
				<img
					src={item.thumbnail}
					alt={item.title}
					class="h-full w-full scale-110 animate-pulse object-cover"
				/>
				<div class="absolute inset-0 bg-black/20"></div>

				<!-- Playing Indicator -->
				<div
					class="absolute top-4 right-4 flex items-center gap-1 rounded bg-seko-accent/90 px-2 py-1 text-xs font-bold text-black"
				>
					<span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
					PLAYING
				</div>

				<!-- Progress Bar Mock -->
				<div class="absolute right-0 bottom-0 left-0 h-1 bg-white/20">
					<div class="h-full w-2/3 animate-[width_2s_ease-in-out_infinite] bg-seko-accent"></div>
				</div>
			</div>

			<!-- Overlay Info (Hidden on hover) -->
			<div
				class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 opacity-100 transition-opacity duration-300 group-hover:opacity-0"
			>
				<h3 class="text-lg font-bold text-white">{item.title}</h3>
				<div class="flex items-center gap-2 text-sm text-gray-300">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-4 w-4"
					>
						<path
							fill-rule="evenodd"
							d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{item.duration}</span>
				</div>
			</div>

			<!-- Play Button Overlay (Center) -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0"
			>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="ml-1 h-6 w-6 text-white"
					>
						<path
							fill-rule="evenodd"
							d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			</div>
		</div>
	{/each}
</div>
