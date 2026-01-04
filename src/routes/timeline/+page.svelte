<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Clock, Play, Sparkles } from 'lucide-svelte';
	import { client } from '$lib/orpc';
	import { onDestroy, onMount } from 'svelte';

	let tasks = $state<any[]>([]);
	let isLoading = $state(true);
	let interval: any;

	const fetchTasks = async () => {
		try {
			tasks = await client.task.list();
		} catch (err) {
			console.error('Failed to fetch tasks:', err);
		} finally {
			isLoading = false;
		}
	};

	onMount(() => {
		fetchTasks();
		interval = setInterval(fetchTasks, 5000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	// Helper to format time (HH:mm:ss)
	function formatTime(date: Date) {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Helper to group videos by date
	function groupVideosByDate(videosList: any[]) {
		const groups: Record<string, any[]> = {};

		videosList.forEach((video: any) => {
			const date = video.createdAt;
			const today = new Date();
			const yesterdayDate = new Date();
			yesterdayDate.setDate(today.getDate() - 1);

			let key = date.toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});

			if (date.toDateString() === today.toDateString()) {
				key = 'Today';
			} else if (date.toDateString() === yesterdayDate.toDateString()) {
				key = 'Yesterday';
			}

			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(video);
		});

		// Current implementation automatically effectively sorts by insertion if input is sorted,
		// but for robustness we could sort keys or entries.
		// Assuming mock data is roughly ordered or we just iterate object entries.
		// Convert to array for easy iteration in Svelte
		return Object.entries(groups).sort((a, b) => {
			// Sort groups: Today first, then Yesterday, etc.
			if (a[0] === 'Today') return -1;
			if (b[0] === 'Today') return 1;
			if (a[0] === 'Yesterday') return -1;
			if (b[0] === 'Yesterday') return 1;
			return new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime();
		});
	}

	let groupedVideos = $derived(groupVideosByDate(tasks));
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
					{tasks.length} Creations
				</span>
			</div>
		</div>

		{#each groupedVideos as [dateGroup, videosInGroup]}
			<div class="mb-10" in:fade>
				<h2
					class="sticky top-16 z-10 mb-6 border-b border-white/5 bg-seko-bg/90 py-2 text-xl font-bold text-white backdrop-blur-md"
				>
					{dateGroup}
				</h2>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each videosInGroup as video (video.id)}
						<a
							href="/timeline/{video.id}"
							class="group relative block aspect-9/16 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:border-seko-accent/50 hover:shadow-[0_0_30px_rgba(163,230,53,0.15)] focus:ring-2 focus:ring-seko-accent focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
							in:fade={{ duration: 400, delay: Number(video.id) * 50 }}
						>
							<!-- Time Badge (Always Visible) -->
							<div
								class="absolute top-3 right-3 z-20 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-xs font-medium text-white shadow-sm backdrop-blur-md"
							>
								{formatTime(video.createdAt)}
							</div>

							{#if video.status === 'completed' && video.thumbnail}
								<img
									src={video.thumbnail}
									alt={video.prompt}
									class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
								/>
								<div
									class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-90"
								></div>

								<!-- Play Button Overlay -->
								<div class="absolute inset-0 flex items-center justify-center">
									<div
										class="flex h-16 w-16 transform items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110"
									>
										<Play class="ml-1 h-6 w-6 fill-white" />
									</div>
								</div>

								<!-- Content Overlay -->
								<div class="absolute right-0 bottom-0 left-0 p-5">
									<div class="mb-2 flex items-center justify-between font-mono text-xs opacity-60">
										<div class="flex items-center gap-2 text-seko-accent">
											<span class="rounded bg-seko-accent/10 px-1.5 py-0.5">HD</span>
											<span>•</span>
											<span>{video.duration}</span>
										</div>
										<!-- Removed time from here -->
									</div>
									<p
										class="line-clamp-2 text-sm leading-snug font-medium text-white drop-shadow-md group-hover:text-white/90"
									>
										{video.prompt}
									</p>
									<div class="mt-3 flex items-center gap-2">
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
		{/each}
	</div>
</div>
