<script lang="ts">
	import { client } from '$lib/orpc';

	let { onGenerate } = $props<{
		onGenerate?: (res: {
			videoAssetId?: string;
			videoTaskId?: string;
			assetId?: string;
			url?: string;
			type: 'video' | 'image';
		}) => void;
	}>();

	let dragOver = $state(false);
	let file: File | null = $state(null);
	let prompt = $state(
		'请你是一个专业的TVC广告分镜师，图中的产品是我这次TVC广告的主要展示产品，请你设计为这款产品设计一个展示珠宝极致美感的有点夸张的剧情故事，主人公是一个黑发亚洲女性，做成九宫格的分镜图， 每个镜头的分辨率是720x1280，输出图的总分辨率是2160x3840，比例都是9:16竖版的，要求是黑白线稿风格，但产品需保证真实的色彩，且要保持产品的一致'
	);
	// 你是一位专业的电视广告大师，请使用图片中的九个分镜图，制作一个15秒的真人实拍电视广告视频，主人公是一个黑发的亚洲女性，展现一个极具创意的故事，请添加中文配音，保持产品的一致性，整个画面全部都是实拍风格

	let loading = $state(false);
	let generationType: 'video' | 'image' | null = $state(null);

	async function generateVideo() {
		if (!file || !prompt) return;

		loading = true;
		generationType = 'video';
		try {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const base64Image = e.target?.result as string;

				try {
					const res = await client.assets.generateVideo({
						image: base64Image,
						prompt: prompt,
						filename: file?.name || 'unknown.png'
					});
					console.log('Generation started:', res);
					if (onGenerate) onGenerate({ ...res, type: 'video' });
				} catch (err) {
					console.error('RPC Error:', err);
					alert('Failed to start generation');
				} finally {
					loading = false;
				}
			};
			reader.readAsDataURL(file);
		} catch (error) {
			console.error(error);
			loading = false;
		}
	}

	async function generateImage() {
		if (!file || !prompt) return;

		loading = true;
		generationType = 'image';
		try {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const base64Image = e.target?.result as string;

				try {
					const res = await client.assets.generateImage({
						image: base64Image,
						prompt: prompt,
						filename: file?.name || 'unknown.png'
					});
					console.log('Image generated:', res);
					if (onGenerate) onGenerate({ ...res, type: 'image' });
				} catch (err) {
					console.error('RPC Error:', err);
					alert('Failed to generate image');
				} finally {
					loading = false;
				}
			};
			reader.readAsDataURL(file);
		} catch (error) {
			console.error(error);
			loading = false;
		}
	}

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

<section class="relative border-t border-white/5 bg-black/30 py-20">
	<div class="container mx-auto max-w-4xl px-4">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold text-white md:text-5xl">Upload Your Product</h2>
			<p class="mx-auto max-w-2xl text-gray-400">
				Upload a high-quality image of your jewelry and describe the ad you want.
			</p>
		</div>

		<div class="rounded-3xl border border-white/10 bg-seko-bg p-8 shadow-2xl md:p-12">
			<div class="grid gap-8 md:grid-cols-2">
				<!-- Image Upload Area -->
				<div
					class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-300
                    {dragOver
						? 'border-seko-accent bg-seko-accent/5'
						: 'border-white/20 bg-white/5 hover:border-white/40'}"
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
						class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						onchange={handleFileSelect}
					/>

					{#if file}
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-seko-accent/20 text-seko-accent"
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
									stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
								>
							</div>
							<p class="max-w-[200px] truncate font-medium text-white">{file.name}</p>
							<p class="mt-1 text-sm text-gray-400">Click to change</p>
						</div>
					{:else}
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white"
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
							<p class="font-medium text-white">Drop image here</p>
							<p class="mt-1 text-sm text-gray-400">or click to browse</p>
						</div>
					{/if}
				</div>

				<!-- Text Input Area -->
				<div class="flex flex-col">
					<label for="prompt" class="mb-2 text-sm font-medium text-gray-300"
						>Ad Copy / Instructions</label
					>
					<textarea
						id="prompt"
						bind:value={prompt}
						placeholder="E.g. 'Showcase the sparkle of the diamond with slow motion camera movements. Elegant and timeless vibe.'"
						class="w-full flex-grow resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-white placeholder-gray-500 transition-all focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="mt-8 flex flex-col gap-4 md:flex-row">
				<button
					class="w-full transform rounded-xl bg-gradient-to-r from-seko-accent to-seko-purple px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!file || loading}
					onclick={generateVideo}
				>
					{loading && generationType === 'video' ? 'Generating Video...' : 'Generate 15s Video'}
				</button>
				<button
					class="w-full transform rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!file || loading}
					onclick={generateImage}
				>
					{loading && generationType === 'image' ? 'Generating 4K Image...' : 'Generate 4K Image'}
				</button>
			</div>
		</div>
	</div>
</section>
