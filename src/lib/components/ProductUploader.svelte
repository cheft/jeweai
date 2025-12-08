<script lang="ts">
	let dragOver = $state(false);
	let file: File | null = $state(null);
	let prompt = $state('');

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			file = e.dataTransfer.files[0];
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
		}
	}
</script>

<section class="py-20 bg-black/30 relative border-t border-white/5">
	<div class="container mx-auto px-4 max-w-4xl">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-5xl font-bold mb-4 text-white">Upload Your Product</h2>
			<p class="text-gray-400 max-w-2xl mx-auto">
				Upload a high-quality image of your jewelry and describe the ad you want.
			</p>
		</div>

		<div class="bg-seko-bg border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
			<div class="grid md:grid-cols-2 gap-8">
				<!-- Image Upload Area -->
				<div
					class="relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300
                    {dragOver
						? 'border-seko-accent bg-seko-accent/5'
						: 'border-white/20 hover:border-white/40 bg-white/5'}"
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={handleDrop}
					role="button"
					tabindex="0"
				>
					<input
						type="file"
						accept="image/*"
						class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						onchange={handleFileSelect}
					/>

					{#if file}
						<div class="text-center">
							<div
								class="w-16 h-16 mx-auto bg-seko-accent/20 text-seko-accent rounded-full flex items-center justify-center mb-4"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M20 6 9 17l-5-5" /></svg
								>
							</div>
							<p class="text-white font-medium truncate max-w-[200px]">{file.name}</p>
							<p class="text-sm text-gray-400 mt-1">Click to change</p>
						</div>
					{:else}
						<div class="text-center">
							<div
								class="w-16 h-16 mx-auto bg-white/10 text-white rounded-full flex items-center justify-center mb-4"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle
										cx="9"
										cy="9"
										r="2"
									/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg
								>
							</div>
							<p class="text-white font-medium">Drop image here</p>
							<p class="text-sm text-gray-400 mt-1">or click to browse</p>
						</div>
					{/if}
				</div>

				<!-- Text Input Area -->
				<div class="flex flex-col">
					<label for="prompt" class="text-sm font-medium text-gray-300 mb-2"
						>Ad Copy / Instructions</label
					>
					<textarea
						id="prompt"
						bind:value={prompt}
						placeholder="E.g. 'Showcase the sparkle of the diamond with slow motion camera movements. Elegant and timeless vibe.'"
						class="flex-grow w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-seko-accent focus:ring-1 focus:ring-seko-accent resize-none transition-all"
					></textarea>
				</div>
			</div>

			<div class="mt-8 flex justify-end">
				<button
					class="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-seko-accent to-seko-purple text-white font-bold rounded-xl hover:opacity-90 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!file}
				>
					Generate Video
				</button>
			</div>
		</div>
	</div>
</section>
