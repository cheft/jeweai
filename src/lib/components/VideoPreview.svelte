<script lang="ts">
	import { fade } from 'svelte/transition';
	import heroBg from '$lib/assets/hero-bg.png'; // Use hero bg as a mock thumbnail

	let isGenerating = $state(false);
	let isReady = $state(false);

	// Simulate generation process (for demo purposes, this would be triggered by parent)
	export function startGeneration() {
		isGenerating = true;
		isReady = false;
		setTimeout(() => {
			isGenerating = false;
			isReady = true;
		}, 3000);
	}
</script>

<section class="py-20 bg-seko-bg border-t border-white/5">
	<div class="container mx-auto px-4 text-center">
		{#if !isGenerating && !isReady}
			<div class="py-12 text-gray-500">
				<p>Video preview will appear here after generation.</p>
			</div>
		{:else if isGenerating}
			<div class="py-20 flex flex-col items-center justify-center" in:fade>
				<div
					class="w-16 h-16 border-4 border-seko-accent border-t-transparent rounded-full animate-spin mb-6"
				></div>
				<h3 class="text-2xl font-bold text-white animate-pulse">Generating Your Ad...</h3>
				<p class="text-gray-400 mt-2">AI is rendering cinematic shots</p>
			</div>
		{:else if isReady}
			<div class="max-w-4xl mx-auto" in:fade>
				<h2 class="text-3xl font-bold text-white mb-8">Your AI-Generated Ad</h2>
				<div
					class="relative aspect-video rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(163,230,53,0.15)] border border-white/10 group"
				>
					<img src={heroBg} alt="Generated Video Thumbnail" class="w-full h-full object-cover" />
					<div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors cursor-pointer">
						<div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 transition-transform transform group-hover:scale-110">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="w-8 h-8 text-white ml-1"
							>
								<path
									fill-rule="evenodd"
									d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					</div>
                    
                    <!-- Mock controls -->
                    <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="h-1 bg-white/30 rounded-full mb-4 overflow-hidden">
                            <div class="h-full w-1/3 bg-seko-accent"></div>
                        </div>
                        <div class="flex justify-between text-white text-sm">
                            <span>0:05 / 0:15</span>
                            <div class="flex gap-4">
                                <span>HD</span>
                                <span>Full Screen</span>
                            </div>
                        </div>
                    </div>
				</div>
                
                <div class="mt-8 flex justify-center gap-4">
                    <button class="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium">
                        Download Video
                    </button>
                    <button class="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors font-medium">
                        Share Link
                    </button>
                </div>
			</div>
		{/if}
	</div>
</section>
