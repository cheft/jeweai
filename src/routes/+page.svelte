<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import StyleSelector from '$lib/components/StyleSelector.svelte';
	import ProductUploader from '$lib/components/ProductUploader.svelte';
	import VideoPreview from '$lib/components/VideoPreview.svelte';

	let videoPreviewComponent: any;

	function handleGenerate() {
		if (videoPreviewComponent) {
			videoPreviewComponent.startGeneration();
			// Scroll to preview
			setTimeout(() => {
				const previewElement = document.getElementById('preview-section');
				previewElement?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		}
	}
</script>

<svelte:head>
	<title>JeweAI - Create Stunning Jewelry Ads</title>
	<meta
		name="description"
		content="Transform static jewelry photos into cinematic video commercials with AI."
	/>
</svelte:head>

<Hero />
<StyleSelector />
<ProductUploader
	onGenerate={(res) => {
		videoPreviewComponent?.startGeneration(res.videoAssetId, res.videoTaskId);
		const previewElement = document.getElementById('preview-section');
		previewElement?.scrollIntoView({ behavior: 'smooth' });
	}}
/>
<div id="preview-section">
	<VideoPreview bind:this={videoPreviewComponent} />
</div>
