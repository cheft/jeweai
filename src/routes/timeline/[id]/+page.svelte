<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		ChevronLeft,
		Download,
		Share2,
		Wand2,
		Image as ImageIcon,
		Copy,
		Check,
		Clock
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { client } from '$lib/orpc';

	let assetId = $derived($page.params.id);
	let asset = $state<any>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let copied = $state(false);

	const R2_COVER_DOMAIN = 'https://pub-0f1ebbb2b0ed48f9a0dbe8a44a832060.r2.dev';

	onMount(() => {
		fetchAsset();
	});

	async function fetchAsset() {
		isLoading = true;
		error = null;
		try {
			asset = await client.assets.get({ id: assetId });
		} catch (err: any) {
			console.error('Failed to fetch asset:', err);
			error = err.message || 'Failed to load asset';
		} finally {
			isLoading = false;
		}
	}

	function copyPrompt() {
		if (asset?.prompt) {
			navigator.clipboard.writeText(asset.prompt);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'Unknown';
		const d = new Date(date);
		return d.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div
	class="min-h-screen bg-seko-bg bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-seko-accent/5 via-seko-bg to-seko-bg p-4 pt-12 md:p-8"
>
	<!-- Floating Back Navigation -->
	<a
		href="/timeline"
		class="fixed left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-seko-bg/80 px-4 py-2 text-sm font-medium text-gray-400 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white md:left-8"
		style="top: 92px;"
	>
		<ChevronLeft class="h-4 w-4" />
		Back
	</a>

	<div class="container mx-auto max-w-6xl">
		{#if isLoading}
			<div class="flex items-center justify-center py-20">
				<div
					class="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-seko-accent"
				></div>
			</div>
		{:else if error}
			<div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
				<p class="text-red-400">{error}</p>
			</div>
		{:else if asset}
			{@const isPortrait = asset.height && asset.width && asset.height > asset.width}
			{@const formatString =
				asset.width && asset.height ? `${asset.width}x${asset.height}` : '1080p'}
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- Main Content (Video Player) -->
				<div class="space-y-6 lg:col-span-2">
					<div
						class="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] {isPortrait
							? 'max-h-[80vh]'
							: 'aspect-video'}"
						style={isPortrait ? `aspect-ratio: ${asset.width}/${asset.height}` : ''}
					>
						{#if asset.type === 'video' && asset.videoUrl}
							<video
								src={asset.videoUrl}
								poster={asset.coverUrl}
								controls
								class="h-full w-full object-contain"
								autoplay
								muted
								loop
							>
								<track kind="captions" />
							</video>
						{:else if asset.type === 'image' && asset.originalImageUrl}
							<!-- Show original full-resolution image for image assets -->
							<img
								src={asset.originalImageUrl}
								alt={asset.name}
								class="h-full w-full object-contain"
							/>
						{:else if asset.taskStatus === 'generating'}
							<div class="absolute inset-0 flex flex-col items-center justify-center">
								<div
									class="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-seko-accent"
								></div>
								<p class="text-lg text-white">Generating video...</p>
							</div>
							{#if asset.coverUrl}
								<img
									src={asset.coverUrl}
									class="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 blur-sm"
									alt="bg"
								/>
							{/if}
						{:else if asset.taskStatus === 'queued'}
							<div class="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
								<Clock class="mb-4 h-12 w-12 text-gray-500" />
								<p class="text-gray-500">Video in queue</p>
							</div>
						{:else if asset.coverUrl}
							<!-- Fallback: Show cover image -->
							<img src={asset.coverUrl} alt={asset.name} class="h-full w-full object-cover" />
						{:else}
							<div class="absolute inset-0 flex items-center justify-center bg-black/60">
								<p class="text-gray-500">No preview available</p>
							</div>
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
								<h1 class="text-xl font-bold text-white">Generation {asset.taskId || asset.id}</h1>
								<p class="text-sm text-gray-400">Updated {formatDate(asset.updatedAt)}</p>
							</div>
						</div>
						<div class="flex gap-3">
							{#if asset.videoUrl}
								<a
									href={asset.videoUrl}
									download
									class="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
								>
									<Download class="h-4 w-4" />
									Download
								</a>
							{/if}
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
					{#if asset.prompt}
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
								<div
									class="absolute top-0 bottom-0 -left-3 w-1 rounded-full bg-seko-accent/20"
								></div>
								<p class="pl-2 leading-relaxed text-gray-300 italic">
									"{asset.prompt}"
								</p>
							</div>
						</div>
					{/if}

					<!-- Reference Image Card -->
					{#if asset.referenceAsset}
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
							<div class="mb-4 flex items-center gap-2 text-blue-400">
								<ImageIcon class="h-5 w-5" />
								<h3 class="font-semibold">Reference Image</h3>
							</div>
							<div class="group relative cursor-pointer overflow-hidden rounded-lg">
								<img
									src={asset.referenceAsset.coverUrl}
									alt="Reference"
									class="w-full object-cover transition-transform duration-500 group-hover:scale-110"
								/>
								{#if asset.referenceAsset.originalUrl}
									<a
										href={asset.referenceAsset.originalUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<span class="text-sm font-medium text-white">View Original</span>
									</a>
								{/if}
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
								<span class="font-mono text-gray-300">{asset.model || 'SekoMotion v2.0'}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Format</span>
								<span class="font-mono text-gray-300">{formatString} · MP4</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Type</span>
								<span class="font-mono text-gray-300 capitalize">{asset.type}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-500">Status</span>
								<span
									class="capitalize"
									class:text-seko-accent={asset.taskStatus === 'completed'}
									class:text-yellow-500={asset.taskStatus === 'generating'}
									class:text-gray-400={asset.taskStatus === 'queued'}
								>
									{asset.taskStatus || asset.status}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
