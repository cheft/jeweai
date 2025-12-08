<script lang="ts">
	import heroBg from '$lib/assets/hero-bg.png';
</script>

<section class="relative h-screen flex items-center justify-center overflow-hidden">
	<!-- Background Video/Image -->
	<div class="absolute inset-0 z-0">
		<img
			src={heroBg}
			alt="Jewelry Background"
			class="w-full h-full object-cover opacity-50"
		/>
		<div
			class="absolute inset-0 bg-gradient-to-b from-seko-bg/80 via-seko-bg/50 to-seko-bg"
		></div>
	</div>

	<div class="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16">
		<div
			class="inline-block mb-4 px-3 py-1 rounded-full border border-seko-accent/30 bg-seko-accent/10 text-seko-accent text-sm font-medium tracking-wide uppercase"
		>
			AI Video Generation
		</div>
		<h1
			class="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white"
		>
			Create Stunning <br />
			<span
				class="text-transparent bg-clip-text bg-gradient-to-r from-seko-accent to-seko-purple"
			>
				Jewelry Ads
			</span>
			with AI
		</h1>
		<p class="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
			Transform static product photos into cinematic video commercials in seconds. No filming required.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
			<button
				class="px-8 py-4 bg-seko-accent text-black font-bold rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
			>
				Start Generating Free
			</button>
			<a
				href="/gallery"
				class="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-full hover:bg-white/20 transition-all"
			>
				View Gallery
			</a>
		</div>
	</div>
</section>
