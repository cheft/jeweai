<script lang="ts">
	import styleLuxury from '$lib/assets/style-luxury.png';
	import styleMinimalist from '$lib/assets/style-minimalist.png';
	import styleNature from '$lib/assets/style-nature.png';
	import styleUrban from '$lib/assets/style-urban.png';

	let selectedStyle = $state('luxury');

	const styles = [
		{
			id: 'luxury',
			name: 'Classic Luxury',
			image: styleLuxury,
			description: 'Elegant, warm lighting, bokeh'
		},
		{
			id: 'minimalist',
			name: 'Modern Minimalist',
			image: styleMinimalist,
			description: 'Clean, white, soft shadows'
		},
		{
			id: 'nature',
			name: 'Organic Nature',
			image: styleNature,
			description: 'Floral, natural light, fresh'
		},
		{
			id: 'urban',
			name: 'Urban Edge',
			image: styleUrban,
			description: 'Neon, concrete, bold'
		}
	];
</script>

<section class="py-20 bg-seko-bg relative">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-5xl font-bold mb-4 text-white">Choose Your Aesthetic</h2>
			<p class="text-gray-400 max-w-2xl mx-auto">
				Select a visual style that matches your brand identity.
			</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
			{#each styles as style}
				<button
					class="group relative rounded-2xl overflow-hidden aspect-[3/4] border-2 transition-all duration-300 text-left
                    {selectedStyle === style.id
						? 'border-seko-accent shadow-[0_0_30px_rgba(163,230,53,0.2)] scale-105 z-10'
						: 'border-white/10 hover:border-white/30 hover:scale-102'}"
					onclick={() => (selectedStyle = style.id)}
				>
					<img
						src={style.image}
						alt={style.name}
						class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
					/>
					<div
						class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
					></div>

					<div class="absolute bottom-0 left-0 p-6 w-full">
						<h3 class="text-xl font-bold text-white mb-1">{style.name}</h3>
						<p class="text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
							{style.description}
						</p>
					</div>

					{#if selectedStyle === style.id}
						<div class="absolute top-4 right-4 bg-seko-accent text-black p-1 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="w-4 h-4"
							>
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</section>
