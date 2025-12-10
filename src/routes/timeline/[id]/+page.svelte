<script lang="ts">
	import { page } from '$app/stores';
	import {
		ChevronLeft,
		Download,
		Share2,
		Sparkles,
		Wand2,
		Image as ImageIcon,
		Copy,
		Check
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	// Mock Data (Matches timeline page)
	const videos = [
		{
			id: '1',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1200&auto=format&fit=crop',
			videoUrl: 'https://cdn.coverr.co/videos/coverr-futuristic-city-4363/1080p.mp4',
			prompt:
				'A futuristic city with neon lights and flying cars, cyberpunk style, cinematic lighting, 8k resolution, highly detailed',
			referenceImage:
				'https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=400&auto=format&fit=crop',
			duration: '0:15',
			createdAt: '2 hours ago',
			model: 'SekoMotion v2.0'
		},
		{
			id: '2',
			status: 'generating',
			// Fallback for generating state viewing
			thumbnail:
				'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
			prompt: 'Portrait of a warrior princess in golden armor',
			referenceImage:
				'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
			duration: null,
			createdAt: 'Just now',
			model: 'SekoMotion v2.0'
		},
		{
			id: '3',
			status: 'queued',
			thumbnail:
				'https://images.unsplash.com/photo-1599708153386-62e589855b7f?q=80&w=400&auto=format&fit=crop',
			prompt: 'Peaceful zen garden with cherry blossoms falling',
			referenceImage:
				'https://images.unsplash.com/photo-1599708153386-62e589855b7f?q=80&w=400&auto=format&fit=crop',
			duration: null,
			createdAt: '5 mins ago',
			model: 'SekoMotion v2.0'
		},
		{
			id: '4',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=1200&auto=format&fit=crop',
			videoUrl: 'https://cdn.coverr.co/videos/coverr-foggy-mountains-2646/1080p.mp4',
			prompt: 'Cinematic drone shot of a misty mountain range at sunrise',
			referenceImage:
				'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400&auto=format&fit=crop',
			duration: '0:10',
			createdAt: '1 day ago',
			model: 'SekoMotion v2.0'
		},
		{
			id: '5',
			status: 'completed',
			thumbnail:
				'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop',
			videoUrl: 'https://cdn.coverr.co/videos/coverr-computer-motherboard-assembly-4552/1080p.mp4',
			prompt: 'Macro shot of a computer circuit board with glowing data streams',
			referenceImage:
				'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
			duration: '0:08',
			createdAt: '2 days ago',
			model: 'SekoMotion v2.0'
		},
		{
			id: '6',
			status: 'queued',
			prompt: 'Cute cat astronaut floating in zero gravity',
			referenceImage:
				'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&auto=format&fit=crop',
			createdAt: '10 mins ago',
			model: 'SekoMotion v2.0'
		}
	];

	let id = $derived($page.params.id);
	let video = $derived(videos.find((v) => v.id === id) || videos[0]);

	let copied = $state(false);

	function copyPrompt() {
		navigator.clipboard.writeText(video.prompt);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div
	class="min-h-screen bg-seko-bg bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-seko-accent/5 via-seko-bg to-seko-bg p-4 pt-12 md:p-8 md:pt-20"
>
	<div class="container mx-auto max-w-6xl">
		<!-- Back Navigation -->
		<a
			href="/timeline"
			class="mb-8 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
		>
			<ChevronLeft class="h-4 w-4" />
			Back to Timeline
		</a>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Main Content (Video Player) -->
			<div class="space-y-6 lg:col-span-2">
				<div
					class="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)]"
				>
					{#if video.status === 'completed'}
						<video
							src={video.videoUrl}
							poster={video.thumbnail}
							controls
							class="h-full w-full object-cover"
							autoplay
							muted
							loop
						>
							<track kind="captions" />
						</video>
					{:else}
						<!-- Placeholder state for non-completed items -->
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							{#if video.status === 'generating'}
								<div
									class="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-seko-accent"
								></div>
								<p class="text-lg text-white">Generating video...</p>
							{:else}
								<Clock class="mb-4 h-12 w-12 text-gray-500" />
								<p class="text-gray-500">Video in queue</p>
							{/if}
						</div>
						<!-- Show reference image as background if available -->
						{#if video.referenceImage}
							<img
								src={video.referenceImage}
								class="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 blur-sm"
								alt="bg"
							/>
						{/if}
					{/if}
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-seko-accent to-emerald-500 font-bold text-black"
						>
							AI
						</div>
						<div>
							<h1 class="text-xl font-bold text-white">Generation #{video.id}</h1>
							<p class="text-sm text-gray-400">Created {video.createdAt}</p>
						</div>
					</div>
					<div class="flex gap-3">
						<button
							class="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
						>
							<Download class="h-4 w-4" />
							Download
						</button>
						<button
							class="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
						>
							<Share2 class="h-4 w-4" />
							Share
						</button>
					</div>
				</div>
			</div>

			<!-- Sidebar (Details) -->
			<div class="space-y-6">
				<!-- Prompt Card -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2 text-seko-accent">
							<Wand2 class="h-5 w-5" />
							<h3 class="font-semibold">Prompt</h3>
						</div>
						<button
							class="text-gray-500 transition-colors hover:text-white"
							onclick={copyPrompt}
							title="Copy prompt"
						>
							{#if copied}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<div class="relative">
						<div class="absolute top-0 bottom-0 -left-3 w-1 rounded-full bg-seko-accent/20"></div>
						<p class="pl-2 leading-relaxed text-gray-300 italic">
							"{video.prompt}"
						</p>
					</div>
				</div>

				<!-- Reference Image Card -->
				{#if video.referenceImage}
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
						<div class="mb-4 flex items-center gap-2 text-blue-400">
							<ImageIcon class="h-5 w-5" />
							<h3 class="font-semibold">Reference Image</h3>
						</div>
						<div class="group relative cursor-pointer overflow-hidden rounded-lg">
							<img
								src={video.referenceImage}
								alt="Reference"
								class="w-full object-cover transition-transform duration-500 group-hover:scale-110"
							/>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<span class="text-sm font-medium text-white">View Original</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Model Info -->
				<div class="rounded-2xl border border-white/5 bg-white/2 p-6">
					<h3 class="mb-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
						Generation Details
					</h3>
					<div class="space-y-3">
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">Model</span>
							<span class="font-mono text-gray-300">{video.model}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">Format</span>
							<span class="font-mono text-gray-300">1080p · MP4</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">Status</span>
							<span
								class="capitalize"
								class:text-seko-accent={video.status === 'completed'}
								class:text-yellow-500={video.status === 'generating'}>{video.status}</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
