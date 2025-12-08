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
		}
	];
</script>

<svelte:head>
	<title>Gallery - JewelAI</title>
	<meta name="description" content="Explore cinematic jewelry ads generated with JewelAI." />
</svelte:head>

<div class="pt-24 pb-20 min-h-screen">
	<div class="container mx-auto px-4">
		<div class="text-center mb-16">
			<h1 class="text-4xl md:text-6xl font-bold mb-6 text-white">Inspiration Gallery</h1>
			<p class="text-xl text-gray-400 max-w-2xl mx-auto">
				Discover what's possible with JewelAI. Explore a collection of stunning, AI-generated
				jewelry commercials.
			</p>
		</div>

		<GalleryGrid items={galleryItems} />
        
        <div class="mt-20 text-center">
            <p class="text-gray-400 mb-6">Ready to create your own?</p>
            <a href="/" class="inline-block px-8 py-4 bg-seko-accent text-black font-bold rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
                Start Generating Free
            </a>
        </div>
	</div>
</div>
