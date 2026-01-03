<script lang="ts">
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import { slide, fly, fade, scale } from 'svelte/transition';
	import { cubicOut, backOut, quintOut } from 'svelte/easing';
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
	let fileInput: HTMLInputElement;
	let selectedStyle: { id: string; name: string; thumbnail: any } | null = null;

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

<div class="min-h-screen pt-24 pb-20">
	<div class="container mx-auto max-w-5xl px-4">
		<!-- AI Prompt Section -->
		<div class="mb-16">
			<h2 class="mb-10 text-center text-3xl font-medium text-white md:text-5xl">
				有什么新的产品灵感？
			</h2>

			<div
				class="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#1a1a1a]/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
			>
				<!-- Tag Area -->
				<div class="mb-2 flex min-h-[48px] flex-wrap gap-3">
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
							<button
								class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
								on:click={() => {
									uploadedImage = null;
									if (fileInput) fileInput.value = '';
								}}
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
					placeholder="输入你的灵感，AI会自动为你策划内容生成视频"
					class="min-h-[120px] w-full resize-none bg-transparent px-4 pt-2 text-xl leading-relaxed text-white placeholder-gray-500 outline-none"
				></textarea>

				<div class="flex items-center justify-between px-4">
					<div class="flex items-center space-x-6 text-gray-400">
						<label
							class="group relative cursor-pointer transition-all duration-300 hover:scale-110 hover:text-white"
						>
							<input
								bind:this={fileInput}
								type="file"
								class="hidden"
								accept="image/*"
								on:change={(e) => {
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
						</button>
						<button
							class="transition-all duration-300 hover:scale-110 hover:text-white {isStyleSelectorOpen
								? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
								: ''}"
							on:click={() => (isStyleSelectorOpen = !isStyleSelectorOpen)}
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
					</div>

					<div class="flex items-center space-x-6">
						<div class="flex items-center space-x-3">
							<span class="text-sm font-medium text-gray-400">仅生成图片</span>
							<button
								class="relative h-6 w-11 rounded-full transition-all duration-500 {isImageOnly
									? 'bg-seko-accent'
									: 'bg-gray-700 hover:bg-gray-600'}"
								on:click={() => (isImageOnly = !isImageOnly)}
							>
								<div
									class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-500 {isImageOnly
										? 'translate-x-5'
										: ''}"
								></div>
							</button>
						</div>
						<div class="h-8 w-px bg-white/10"></div>
						<button
							class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-400 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-seko-accent hover:text-black hover:shadow-seko-accent/30 active:scale-95"
							on:click={() => {
								if (!prompt.trim() && !uploadedImage) {
									alert('Please enter a prompt or upload an image!');
									return;
								}
								console.log('Generating with:', {
									prompt,
									uploadedImage,
									isImageOnly,
									selectedStyle
								});
								alert('Generation started!');
							}}
						>
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
								class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg
							>
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
		<div class="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
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
		</div>

		<GalleryGrid items={filteredItems} />

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
