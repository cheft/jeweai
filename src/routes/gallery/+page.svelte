<script lang="ts">
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import { client } from '$lib/orpc';
	import { slide, fly, fade, scale } from 'svelte/transition';
	import { cubicOut, backOut, quintOut } from 'svelte/easing';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import galleryRing from '$lib/assets/gallery-ring.png';
	import galleryNecklace from '$lib/assets/gallery-necklace.png';
	import galleryEarrings from '$lib/assets/gallery-earrings.png';
	import galleryBracelet from '$lib/assets/gallery-bracelet.png';
	import galleryPortrait1 from '$lib/assets/gallery-portrait-1.png';
	import galleryPortrait2 from '$lib/assets/gallery-portrait-2.png';
	import styleLuxury from '$lib/assets/style-luxury.png';
	import styleUrban from '$lib/assets/style-urban.png';

	let prompt = '';
	let isStyleSelectorOpen = false;
	let isImageOnly = false;
	let uploadedImage: string | null = null;
	let referenceAssetId: string | null = null;
	let fileInput: HTMLInputElement;
	let selectedStyle: { id: string; name: string; thumbnail: any } | null = null;
	let isGenerating = false;
	let isPolishing = false;
	// let orientation: 'landscape' | 'portrait' = 'portrait';
	let imageAspectRatio = '1:1';
	let videoAspectRatio = '9:16';

	$: currentAspectRatio = isImageOnly ? imageAspectRatio : videoAspectRatio;

	let isOrientationOpen = false;

	const allAspectRatios = [
		{ value: '1:1', label: '方形 (1:1)', forVideo: false },
		{ value: '3:2', label: '摄影横屏 (3:2)', forVideo: false },
		{ value: '2:3', label: '摄影竖屏 (2:3)', forVideo: false },
		{ value: '16:9', label: '影视横屏 (16:9)', forVideo: true },
		{ value: '9:16', label: '短视频竖屏 (9:16)', forVideo: true }
	];

	$: filteredAspectRatios = isImageOnly
		? allAspectRatios
		: allAspectRatios.filter((r) => r.forVideo);

	// Check URL params for assetId
	onMount(() => {
		const assetId = $page.url.searchParams.get('assetId');
		if (assetId) {
			referenceAssetId = assetId;
			loadReferenceAsset(assetId);
		}
	});

	async function loadReferenceAsset(assetId: string) {
		try {
			const asset = await client.assets.get({ id: assetId });
			if (asset.originalImageUrl) {
				uploadedImage = asset.originalImageUrl;
			}
		} catch (err) {
			console.error('Failed to load reference asset:', err);
		}
	}

	async function handleGenerate() {
		if (!prompt.trim() && !uploadedImage && !referenceAssetId) {
			alert('请输入提示词或上传参考图片');
			return;
		}

		isGenerating = true;
		try {
			const payload: any = {
				prompt,
				styleId: selectedStyle?.id,
				isImageOnly,
				aspectRatio: currentAspectRatio,
				// Backward compatibility if needed, though aspect ratio is more precise
				orientation:
					currentAspectRatio.startsWith('9') ||
					currentAspectRatio.startsWith('2') ||
					currentAspectRatio === '1:1'
						? 'portrait'
						: 'landscape'
			};

			// If we have referenceAssetId, use it; otherwise use uploaded image
			if (referenceAssetId) {
				payload.assetId = referenceAssetId;
			} else if (uploadedImage) {
				payload.image = uploadedImage;
				payload.filename = 'reference_image.png';
			}

			const res = await client.task.create(payload);

			console.log('Generation result:', res);
			alert('生成请求已提交！任务ID: ' + res.taskId);

			// Optional: Clear inputs after success
			// prompt = '';
			// uploadedImage = null;
			// selectedStyle = null;
		} catch (error) {
			console.error('Generation Error:', error);
			alert('生成失败，请检查后端服务是否正常运行');
		} finally {
			isGenerating = false;
		}
	}

	async function handlePolish() {
		if (!prompt.trim()) {
			alert('请先输入提示词再进行润色');
			return;
		}

		isPolishing = true;
		try {
			const polished = await client.task.polish({ prompt });
			if (polished) {
				prompt = polished;
			}
		} catch (error) {
			console.error('Polish Error:', error);
			alert('润色失败，请稍后重试');
		} finally {
			isPolishing = false;
		}
	}

	const styles = [
		{ id: '1', name: '美式卡通', thumbnail: styleLuxury },
		{ id: '2', name: '2D古风', thumbnail: galleryPortrait1, hasPsIcon: true },
		{ id: '3', name: '3D古风', thumbnail: galleryPortrait2 },
		{ id: '4', name: '韩漫二次元', thumbnail: styleUrban },
		{ id: '5', name: '现代都市', thumbnail: galleryNecklace },
		{ id: '6', name: '3D卡通', thumbnail: galleryEarrings },
		{ id: '7', name: '日漫二次元', thumbnail: galleryBracelet },
		{ id: '8', name: '中国工笔画', thumbnail: styleLuxury },
		{ id: '9', name: '写实风格', thumbnail: galleryPortrait1 },
		{ id: '10', name: '彩色水墨', thumbnail: styleUrban }
	];

	let activeCategory = 'All';
	const categories = ['All', 'Ring', 'Earrings', 'Necklace', 'Bangle'];

	const galleryItems = [
		{
			id: '1',
			thumbnail: galleryRing,
			title: 'Sapphire Sparkle',
			duration: '0:15',
			isPortrait: false,
			category: 'Ring'
		},
		{
			id: '2',
			thumbnail: galleryPortrait1,
			title: 'Evening Elegance',
			duration: '0:12',
			isPortrait: true,
			category: 'Earrings'
		},
		{
			id: '3',
			thumbnail: galleryNecklace,
			title: 'Golden Sunset',
			duration: '0:12',
			isPortrait: false,
			category: 'Necklace'
		},
		{
			id: '4',
			thumbnail: galleryEarrings,
			title: 'Pearl Elegance',
			duration: '0:10',
			isPortrait: false,
			category: 'Earrings'
		},
		{
			id: '5',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Necklace'
		},
		{
			id: '6',
			thumbnail: galleryBracelet,
			title: 'Diamond Rotation',
			duration: '0:20',
			isPortrait: false,
			category: 'Bangle'
		},
		{
			id: '7',
			thumbnail: styleLuxury,
			title: 'Royal Collection',
			duration: '0:18',
			isPortrait: false,
			category: 'Ring'
		},
		{
			id: '8',
			thumbnail: styleUrban,
			title: 'Street Style Silver',
			duration: '0:15',
			isPortrait: false,
			category: 'Bangle'
		},
		{
			id: '9',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Necklace'
		},
		{
			id: '10',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Earrings'
		},
		{
			id: '11',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Necklace'
		},
		{
			id: '12',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Ring'
		},
		{
			id: '13',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true,
			category: 'Bangle'
		}
	];

	$: filteredItems =
		activeCategory === 'All'
			? galleryItems
			: galleryItems.filter((item) => item.category === activeCategory);
</script>

<svelte:head>
	<title>Gallery - JeweAI</title>
	<meta name="description" content="Explore cinematic jewelry ads generated with JeweAI." />
</svelte:head>

<div class="min-h-screen pt-16 pb-20">
	<div class="container mx-auto max-w-5xl px-4">
		<!-- AI Prompt Section -->
		<div class="mb-16">
			<h2 class="mb-10 text-center text-3xl font-medium text-white md:text-5xl">
				有什么新的产品灵感？
			</h2>

			<div
				class="relative rounded-[2.5rem] border border-white/10 bg-[#1a1a1a]/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
			>
				<!-- Mode Switcher (Top Left) -->
				<div
					class="absolute top-6 left-6 z-10 flex items-center rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-lg backdrop-blur-xl"
				>
					<div class="relative flex items-center">
						<!-- Sliding Background Indicator -->
						<div
							class="absolute top-0 h-full w-1/2 rounded-xl bg-seko-accent shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all duration-500 ease-out"
							style="left: 0; transform: translateX({isImageOnly ? '100%' : '0%'});"
						></div>

						<button
							class="relative z-10 flex items-center justify-center space-x-3 rounded-xl px-5 py-2.5 text-base font-medium transition-colors duration-500 {!isImageOnly
								? 'text-black'
								: 'text-gray-400 hover:text-white'}"
							on:click={() => (isImageOnly = false)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-video"
								><path
									d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"
								/><rect width="14" height="12" x="2" y="6" rx="2" /></svg
							>
							<span>视频</span>
						</button>
						<button
							class="relative z-10 flex items-center justify-center space-x-3 rounded-xl px-5 py-2.5 text-base font-medium transition-colors duration-500 {isImageOnly
								? 'text-black'
								: 'text-gray-400 hover:text-white'}"
							on:click={() => (isImageOnly = true)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-image"
								><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle
									cx="9"
									cy="9"
									r="2"
								/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg
							>
							<span>图片</span>
						</button>
					</div>
				</div>

				<!-- Tag Area -->
				<div class="mb-4 flex min-h-[48px] flex-wrap gap-4 pl-64">
					{#if uploadedImage}
						<div
							in:fly={{ x: -20, duration: 400, easing: cubicOut }}
							out:fade={{ duration: 200 }}
							class="group flex items-center space-x-3 rounded-2xl border border-white/10 bg-white/5 py-2 pr-3 pl-2 shadow-sm transition-all duration-300 hover:border-seko-accent/50 hover:shadow-seko-accent/10"
						>
							<div
								class="h-10 w-10 transform overflow-hidden rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105"
							>
								<img src={uploadedImage} alt="Uploaded" class="h-full w-full object-cover" />
							</div>
							<span class="font-medium text-white">参考图片</span>
							{#if !referenceAssetId}
								<button
									class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
									on:click={() => {
										uploadedImage = null;
										if (fileInput) fileInput.value = '';
									}}
									aria-label="移除参考图片"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
									>
								</button>
							{/if}
						</div>
					{/if}

					{#if selectedStyle}
						<div
							in:fly={{ x: 20, duration: 400, easing: cubicOut }}
							out:fade={{ duration: 200 }}
							class="group flex items-center space-x-3 rounded-2xl border border-white/10 bg-white/5 py-2 pr-3 pl-2 shadow-sm transition-all duration-300 hover:border-seko-accent/50 hover:shadow-seko-accent/10"
						>
							<div
								class="h-10 w-10 transform overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform duration-300 group-hover:scale-105"
							>
								<img
									src={selectedStyle.thumbnail}
									alt={selectedStyle.name}
									class="h-full w-full object-cover"
								/>
							</div>
							<span class="font-medium text-white">{selectedStyle.name}</span>
							<button
								class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
								on:click={() => (selectedStyle = null)}
								aria-label="移除风格"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
								>
							</button>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={prompt}
					placeholder={isImageOnly
						? '输入你的灵感，AI会自动为你生成高质量图片'
						: '输入你的灵感，AI会自动为你策划内容生成视频'}
					class="min-h-[120px] w-full resize-none bg-transparent p-2 text-xl leading-relaxed text-white placeholder-gray-500 outline-none"
				></textarea>

				<div class="flex items-center justify-between px-4">
					<div class="flex items-center space-x-6 text-gray-400">
						<label
							class="group relative cursor-pointer transition-all duration-300 hover:scale-110 hover:text-white {referenceAssetId
								? 'cursor-not-allowed opacity-50'
								: ''}"
						>
							<input
								bind:this={fileInput}
								type="file"
								class="hidden"
								accept="image/*"
								disabled={!!referenceAssetId}
								on:change={(e) => {
									if (referenceAssetId) return;
									const file = e.currentTarget.files?.[0];
									if (file) {
										const reader = new FileReader();
										reader.onload = (re) => {
											uploadedImage = re.target?.result as string;
										};
										reader.readAsDataURL(file);
									}
								}}
							/>
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
								class="lucide lucide-paperclip transition-transform duration-300 group-hover:rotate-12"
								><path
									d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"
								/></svg
							>
						</label>
						<!-- <button class="transition-all duration-300 hover:scale-110 hover:text-white">
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
								class="lucide lucide-box"
								><path
									d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
								/><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg
							>
						</button>
						<button class="transition-all duration-300 hover:scale-110 hover:text-white">
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
								class="lucide lucide-at-sign"
								><circle cx="12" cy="12" r="4" /><path
									d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"
								/></svg
							>
						</button> -->
						<button
							class="transition-all duration-300 hover:scale-110 hover:text-white {isStyleSelectorOpen
								? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
								: ''}"
							on:click={() => (isStyleSelectorOpen = !isStyleSelectorOpen)}
							aria-label="打开画风列表"
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
								class="lucide lucide-palette"
								><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle
									cx="17.5"
									cy="10.5"
									r=".5"
									fill="currentColor"
								/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle
									cx="6.5"
									cy="12.5"
									r=".5"
									fill="currentColor"
								/><path
									d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.707-.484 2.103-1.206.351-.64.153-1.459-.447-1.928-.562-.439-.736-1.173-.428-1.83.303-.647 1.022-1.036 1.725-1.036h2.547c1.454 0 2.5-1.546 2.5-3 0-5.523-4.477-10-10-10Z"
								/></svg
							>
						</button>
						<!-- Aspect Ratio Selector -->
						<div class="relative">
							<button
								class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium transition-all duration-300 hover:bg-white/10 {isOrientationOpen
									? 'border-seko-accent text-seko-accent'
									: 'text-gray-400'}"
								on:click={() => (isOrientationOpen = !isOrientationOpen)}
							>
								{#if currentAspectRatio === '1:1'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /></svg
									>
									<span>方形 (1:1)</span>
								{:else if currentAspectRatio === '3:2'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect width="21" height="14" x="1.5" y="5" rx="2" /></svg
									>
									<span>摄影横屏 (3:2)</span>
								{:else if currentAspectRatio === '2:3'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect width="14" height="21" x="5" y="1.5" rx="2" /></svg
									>
									<span>摄影竖屏 (2:3)</span>
								{:else if currentAspectRatio === '16:9'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect width="22" height="12.375" x="1" y="5.8125" rx="2" /></svg
									>
									<span>影视横屏 (16:9)</span>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect width="12.375" height="22" x="5.8125" y="1" rx="2" /></svg
									>
									<span>短视频竖屏 (9:16)</span>
								{/if}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="transition-transform {isOrientationOpen ? 'rotate-180' : ''}"
									><path d="m6 9 6 6 6-6" /></svg
								>
							</button>
							{#if isOrientationOpen}
								<div
									transition:fly={{ y: -10, duration: 200 }}
									class="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl backdrop-blur-xl"
								>
									{#each filteredAspectRatios as ratio}
										<button
											class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors {currentAspectRatio ===
											ratio.value
												? 'bg-seko-accent/10 text-seko-accent'
												: 'text-gray-300 hover:bg-white/5'}"
											on:click={() => {
												if (isImageOnly) {
													imageAspectRatio = ratio.value;
												} else {
													videoAspectRatio = ratio.value;
												}
												isOrientationOpen = false;
											}}
										>
											<div class="flex h-5 w-5 items-center justify-center">
												{#if ratio.value === '1:1'}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="18"
														height="18"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><rect width="18" height="18" x="3" y="3" rx="2" /></svg
													>
												{:else if ratio.value === '3:2'}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="18"
														height="18"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><rect width="21" height="14" x="1.5" y="5" rx="2" /></svg
													>
												{:else if ratio.value === '2:3'}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="18"
														height="18"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><rect width="14" height="21" x="5" y="1.5" rx="2" /></svg
													>
												{:else if ratio.value === '16:9'}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="18"
														height="18"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><rect width="22" height="12.375" x="1" y="5.8125" rx="2" /></svg
													>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="18"
														height="18"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><rect width="12.375" height="22" x="5.8125" y="1" rx="2" /></svg
													>
												{/if}
											</div>
											<span>{ratio.label}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="flex items-center space-x-6">
						<!-- AI Polish Button -->
						<button
							class="group flex h-12 items-center space-x-2 rounded-full border border-seko-accent/30 bg-seko-accent/5 px-6 text-seko-accent transition-all duration-300 hover:scale-105 hover:bg-seko-accent hover:text-black hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							on:click={handlePolish}
							disabled={isPolishing || isGenerating}
						>
							{#if isPolishing}
								<svg
									class="h-5 w-5 animate-spin"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span class="text-sm font-bold">润色中...</span>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-wand-2 transition-transform duration-500 group-hover:rotate-12"
									><path d="m2 21 5-5" /><path d="M7 16 16 7" /><path d="m15 15 6 6" /><path
										d="m11 9 3 3"
									/><path d="M21 9V5" /><path d="M21 5H17" /><path d="M14 4.8V2" /><path
										d="M14 2h-4"
									/><path d="M3 10h4" /><path d="M7 10v4" /><path d="m7 3 3 3" /><path
										d="m3 7 3-3"
									/></svg
								>
								<span class="text-sm font-bold">润色</span>
							{/if}
						</button>

						<!-- Generate Button -->
						<button
							class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-400 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-seko-accent hover:text-black hover:shadow-seko-accent/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							on:click={handleGenerate}
							disabled={isGenerating || isPolishing}
						>
							{#if isGenerating}
								<svg
									class="h-5 w-5 animate-spin"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-arrow-up"
									><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg
								>
							{/if}
						</button>
					</div>
				</div>
			</div>

			{#if isStyleSelectorOpen}
				<div
					transition:fly={{ y: 20, duration: 600, easing: backOut }}
					class="mt-6 rounded-[2.5rem] border border-white/10 bg-[#1a1a1a]/60 p-8 shadow-xl backdrop-blur-2xl"
				>
					<h3 class="mb-8 text-2xl font-medium text-white">画风列表</h3>
					<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
						{#each styles as style, i (style.id)}
							<button
								in:scale={{ duration: 400, delay: i * 50, easing: cubicOut, start: 0.95 }}
								class="group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 transition-all duration-500 {selectedStyle?.id ===
								style.id
									? 'scale-105 border-seko-accent shadow-lg shadow-seko-accent/20'
									: 'border-transparent hover:border-white/20 hover:bg-white/5'}"
								on:click={() => {
									selectedStyle = style;
									isStyleSelectorOpen = false;
								}}
							>
								<img
									src={style.thumbnail}
									alt={style.name}
									class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
								/>
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90"
								></div>
								<span
									class="absolute bottom-3 left-4 text-base font-medium text-white transition-transform group-hover:translate-x-1"
									>{style.name}</span
								>
								{#if style.hasPsIcon}
									<div
										class="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg border border-[#31A8FF]/30 bg-[#001e36] text-[11px] font-bold text-[#31A8FF] shadow-lg backdrop-blur-md"
									>
										Ps
									</div>
								{/if}
								{#if selectedStyle?.id === style.id}
									<div
										class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-seko-accent text-black shadow-lg"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="lucide lucide-check"><path d="M20 6 9 17l-5-5" /></svg
										>
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Inspiration Plaza Section -->
		<!-- <div class="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
			<h2 class="text-2xl font-bold text-white md:text-3xl">灵感广场</h2>

			<div
				class="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-1.5 backdrop-blur-lg"
			>
				{#each categories as category}
					<button
						class="rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 {activeCategory ===
						category
							? 'bg-seko-accent text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]'
							: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
						on:click={() => (activeCategory = category)}
					>
						{category}
					</button>
				{/each}
			</div>
		</div> -->

		<!-- <GalleryGrid items={filteredItems} /> -->

		<!-- <div class="mt-20 text-center">
			<p class="mb-6 text-gray-400">Ready to create your own?</p>
			<a
				href="/"
				class="hover:bg-opacity-90 inline-block transform rounded-full bg-seko-accent px-8 py-4 font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all hover:scale-105"
			>
				Start Generating Free
			</a>
		</div> -->
	</div>
</div>
