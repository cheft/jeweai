<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Clock, Play, Sparkles } from 'lucide-svelte';

	// Mock Data
	const videos = [
		{
			id: '1',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=600&auto=format&fit=crop', // Cyberpunk city
			prompt: 'A futuristic city with neon lights and flying cars, cyberpunk style',
			referenceImage:
				'https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=200&auto=format&fit=crop',
			duration: '0:15'
		},
		{
			id: '2',
			status: 'generating',
			thumbnail: null,
			prompt: 'Portrait of a warrior princess in golden armor',
			referenceImage:
				'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
			duration: null
		},
		{
			id: '3',
			status: 'queued',
			thumbnail: null,
			prompt: 'Peaceful zen garden with cherry blossoms falling',
			referenceImage:
				'https://images.unsplash.com/photo-1599708153386-62e589855b7f?q=80&w=200&auto=format&fit=crop',
			duration: null
		},
		{
			id: '4',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=600&auto=format&fit=crop', // Cinematic nature
			prompt: 'Cinematic drone shot of a misty mountain range at sunrise',
			referenceImage:
				'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200&auto=format&fit=crop',
			duration: '0:10'
		},
		{
			id: '5',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop', // Tech
			prompt: 'Macro shot of a computer circuit board with glowing data streams',
			referenceImage:
				'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200&auto=format&fit=crop',
			duration: '0:08'
		},
		{
			id: '6',
			status: 'queued',
			prompt: 'Cute cat astronaut floating in zero gravity',
			referenceImage:
				'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&auto=format&fit=crop'
		}
	];
</script>

<div class="min-h-screen bg-seko-bg p-4 pt-12 md:p-8 md:pt-16">
	<div class="container mx-auto max-w-7xl">
		<div class="mb-12 flex items-center gap-3" in:fade={{ duration: 300 }}>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-seko-accent to-emerald-600 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
			>
				<Sparkles class="h-6 w-6 text-black" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-white md:text-4xl">Your Timeline</h1>
				<p class="text-gray-400">Manage and view your generated videos</p>
			</div>
			<div class="ml-auto hidden sm:block">
				<span
					class="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-gray-300 backdrop-blur-sm"
				>
					{videos.length} Creations
				</span>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each videos as video (video.id)}
				<a
					href="/timeline/{video.id}"
					class="group relative block aspect-9/16 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:border-seko-accent/50 hover:shadow-[0_0_30px_rgba(163,230,53,0.15)] focus:ring-2 focus:ring-seko-accent focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
					in:fade={{ duration: 400, delay: Number(video.id) * 50 }}
				>
					{#if video.status === 'completed' && video.thumbnail}
						<img
							src={video.thumbnail}
							alt={video.prompt}
							class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
						/>
						<div
							class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100"
						></div>

						<!-- Play Button Overlay -->
						<div
							class="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100"
						>
							<div
								class="flex h-16 w-16 transform items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 group-hover:scale-100 hover:scale-110"
							>
								<Play class="ml-1 h-6 w-6 fill-white" />
							</div>
						</div>

						<!-- Content Overlay -->
						<div
							class="absolute right-0 bottom-0 left-0 translate-y-2 p-5 transition-transform duration-300 group-hover:translate-y-0"
						>
							<div
								class="mb-2 flex items-center gap-2 font-mono text-xs text-seko-accent opacity-0 transition-opacity delay-100 group-hover:opacity-100"
							>
								<span class="rounded bg-seko-accent/10 px-1.5 py-0.5">HD</span>
								<span>•</span>
								<span>{video.duration}</span>
							</div>
							<p
								class="line-clamp-2 text-sm leading-snug font-medium text-white drop-shadow-md group-hover:text-white/90"
							>
								{video.prompt}
							</p>
							<div
								class="mt-3 flex items-center gap-2 opacity-0 transition-opacity delay-200 group-hover:opacity-100"
							>
								<img
									src={video.referenceImage}
									alt="Ref"
									class="h-8 w-8 rounded-lg border border-white/30 object-cover shadow-sm"
								/>
								<span class="text-xs text-gray-400">Reference</span>
							</div>
						</div>
					{:else if video.status === 'generating'}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center bg-white/5 p-6 text-center backdrop-blur-sm"
						>
							<div class="relative mb-6 h-16 w-16">
								<div class="absolute inset-0 rounded-full border-4 border-seko-accent/20"></div>
								<div
									class="absolute inset-0 animate-spin rounded-full border-4 border-t-4 border-seko-accent border-t-transparent"
								></div>
							</div>
							<span
								class="mb-2 animate-pulse bg-linear-to-r from-seko-accent to-emerald-400 bg-clip-text text-lg font-bold text-transparent"
								>Generating...</span
							>
							<p class="line-clamp-3 text-sm text-gray-400">{video.prompt}</p>
						</div>
					{:else if video.status === 'queued'}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-6 text-center"
						>
							<div
								class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 shadow-inner"
							>
								<Clock class="h-8 w-8 text-gray-500" />
							</div>
							<span class="mb-2 text-lg font-bold text-gray-400">In Queue</span>
							<div class="w-full max-w-[120px] rounded-full bg-white/5 py-1">
								<p class="font-mono text-xs text-gray-500">Wait time: ~2m</p>
							</div>
						</div>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</div>
