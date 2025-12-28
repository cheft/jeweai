<script lang="ts">
	import { fade } from 'svelte/transition';
	import { client } from '$lib/orpc';
	import heroBg from '$lib/assets/hero-bg.png'; // Use hero bg as a mock thumbnail

	let isGenerating = $state(false);
	let isReady = $state(false);
	let videoUrl = $state('');

	export async function startGeneration(videoAssetId: string, videoTaskId: string) {
		isGenerating = true;
		isReady = false;
		videoUrl = '';

		const poll = async () => {
			try {
				const res = await client.assets.checkStatus({ videoAssetId, videoTaskId });
				if (res.status === 'succeeded') {
					videoUrl = res.url || '';
					isGenerating = false;
					isReady = true;
				} else if (res.status === 'error' || res.status === 'failed') {
					isGenerating = false;
					alert('Generation failed');
				} else {
					// Poll again in 2s
					setTimeout(poll, 2000);
				}
			} catch (err) {
				console.error('Poll error:', err);
				isGenerating = false;
			}
		};

		poll();
	}
</script>

<section class="border-t border-white/5 bg-seko-bg py-20">
	<div class="container mx-auto px-4 text-center">
		{#if !isGenerating && !isReady}
			<div class="py-12 text-gray-500">
				<p>Video preview will appear here after generation.</p>
			</div>
		{:else if isGenerating}
			<div class="flex flex-col items-center justify-center py-20" in:fade>
				<div
					class="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-seko-accent border-t-transparent"
				></div>
				<h3 class="animate-pulse text-2xl font-bold text-white">Generating Your Ad...</h3>
				<p class="mt-2 text-gray-400">AI is rendering cinematic shots</p>
			</div>
		{:else if isReady}
			<div class="mx-auto max-w-4xl" in:fade>
				<h2 class="mb-8 text-3xl font-bold text-white">Your AI-Generated Ad</h2>
				<div
					class="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_50px_rgba(163,230,53,0.15)]"
				>
					{#if videoUrl}
						<video src={videoUrl} controls autoplay class="h-full w-full object-contain">
							<track kind="captions" />
						</video>
					{:else}
						<img src={heroBg} alt="Video Thumbnail" class="h-full w-full object-cover" />
					{/if}
				</div>

				<div class="mt-8 flex justify-center gap-4">
					<button
						class="rounded-lg bg-white/10 px-6 py-3 font-medium text-white transition-colors hover:bg-white/20"
					>
						Download Video
					</button>
					<button
						class="rounded-lg border border-white/20 px-6 py-3 font-medium text-white transition-colors hover:bg-white/5"
					>
						Share Link
					</button>
				</div>
			</div>
		{/if}
	</div>
</section>
