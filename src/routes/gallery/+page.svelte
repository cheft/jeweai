<script lang="ts">
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import galleryRing from '$lib/assets/gallery-ring.png';
	import galleryNecklace from '$lib/assets/gallery-necklace.png';
	import galleryEarrings from '$lib/assets/gallery-earrings.png';
	import galleryBracelet from '$lib/assets/gallery-bracelet.png';
	import galleryPortrait1 from '$lib/assets/gallery-portrait-1.png';
	import galleryPortrait2 from '$lib/assets/gallery-portrait-2.png';
	import styleLuxury from '$lib/assets/style-luxury.png';
	import styleUrban from '$lib/assets/style-urban.png';

	const galleryItems = [
		{
			id: '1',
			thumbnail: galleryRing,
			title: 'Sapphire Sparkle',
			duration: '0:15',
			isPortrait: false
		},
		{
			id: '2',
			thumbnail: galleryPortrait1,
			title: 'Evening Elegance',
			duration: '0:12',
			isPortrait: true
		},
		{
			id: '3',
			thumbnail: galleryNecklace,
			title: 'Golden Sunset',
			duration: '0:12',
			isPortrait: false
		},
		{
			id: '4',
			thumbnail: galleryEarrings,
			title: 'Pearl Elegance',
			duration: '0:10',
			isPortrait: false
		},
		{
			id: '5',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		},
		{
			id: '6',
			thumbnail: galleryBracelet,
			title: 'Diamond Rotation',
			duration: '0:20',
			isPortrait: false
		},
		{
			id: '7',
			thumbnail: styleLuxury,
			title: 'Royal Collection',
			duration: '0:18',
			isPortrait: false
		},
		{
			id: '8',
			thumbnail: styleUrban,
			title: 'Street Style Silver',
			duration: '0:15',
			isPortrait: false
		},
		{
			id: '9',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		},
		{
			id: '10',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		},
		{
			id: '11',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		},
		{
			id: '12',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		},
		{
			id: '13',
			thumbnail: galleryPortrait2,
			title: 'Statement Piece',
			duration: '0:15',
			isPortrait: true
		}
	];
</script>

<svelte:head>
	<title>Gallery - JewelAI</title>
	<meta name="description" content="Explore cinematic jewelry ads generated with JewelAI." />
</svelte:head>

<div class="min-h-screen pt-24 pb-20">
	<div class="container mx-auto px-4">
		<div class="mb-16 text-center">
			<h1 class="mb-6 text-4xl font-bold text-white md:text-6xl">Inspiration Gallery</h1>
			<p class="mx-auto max-w-2xl text-xl text-gray-400">
				Discover what's possible with JewelAI. Explore a collection of stunning, AI-generated
				jewelry commercials.
			</p>
		</div>

		<GalleryGrid items={galleryItems} />

		<div class="mt-20 text-center">
			<p class="mb-6 text-gray-400">Ready to create your own?</p>
			<a
				href="/"
				class="hover:bg-opacity-90 inline-block transform rounded-full bg-seko-accent px-8 py-4 font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all hover:scale-105"
			>
				Start Generating Free
			</a>
		</div>
	</div>
</div>
