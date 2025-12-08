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

<div class="columns-1 sm:columns-2 lg:columns-3 gap-6">
	{#each items as item}
		<div
			class="group relative break-inside-avoid mb-6 rounded-xl overflow-hidden bg-gray-900 border border-white/10 cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-seko-accent/10 hover:border-seko-accent/30"
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
				class="w-full h-full object-cover transition-opacity duration-500 {hoveredId === item.id
					? 'opacity-0'
					: 'opacity-100'}"
			/>

			<!-- "Video" State -->
			<div
				class="absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-300 {hoveredId ===
				item.id
					? 'opacity-100'
					: 'opacity-0'}"
			>
				<!-- Simulated video playback visual -->
				<img
					src={item.thumbnail}
					alt={item.title}
					class="w-full h-full object-cover scale-110 animate-pulse"
				/>
				<div class="absolute inset-0 bg-black/20"></div>
				
                <!-- Playing Indicator -->
                <div class="absolute top-4 right-4 bg-seko-accent/90 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    PLAYING
                </div>

                <!-- Progress Bar Mock -->
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div class="h-full bg-seko-accent w-2/3 animate-[width_2s_ease-in-out_infinite]"></div>
                </div>
			</div>

			<!-- Overlay Info (Hidden on hover) -->
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex flex-col justify-end p-4"
			>
				<h3 class="text-white font-bold text-lg">{item.title}</h3>
				<div class="flex items-center gap-2 text-gray-300 text-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="w-4 h-4"
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
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="w-6 h-6 text-white ml-1"
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
