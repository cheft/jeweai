<script lang="ts">
	import heroBg from '$lib/assets/hero-bg.png';
	import { client } from '$lib/orpc';
</script>

<section class="relative flex h-screen items-center justify-center overflow-hidden">
	<!-- Background Video/Image -->
	<div class="absolute inset-0 z-0">
		<img src={heroBg} alt="Jewelry Background" class="h-full w-full object-cover opacity-50" />
		<div class="absolute inset-0 bg-gradient-to-b from-seko-bg/80 via-seko-bg/50 to-seko-bg"></div>
	</div>

	<div class="relative z-10 mx-auto mt-16 max-w-4xl px-4 text-center">
		<div
			class="mb-4 inline-block rounded-full border border-seko-accent/30 bg-seko-accent/10 px-3 py-1 text-sm font-medium tracking-wide text-seko-accent uppercase"
		>
			AI Video Generation
		</div>
		<h1 class="mb-6 text-5xl leading-tight font-bold tracking-tight text-white md:text-7xl">
			Create Stunning <br />
			<span class="bg-gradient-to-r from-seko-accent to-seko-purple bg-clip-text text-transparent">
				Jewelry Ads
			</span>
			with AI
		</h1>
		<p class="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-gray-300 md:text-2xl">
			Transform static product photos into cinematic video commercials in seconds. No filming
			required.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<button
				onclick={() => {
					client.user.me({}).then((res) => {
						console.log(res);
					});
				}}
				class="hover:bg-opacity-90 transform rounded-full bg-seko-accent px-8 py-4 font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all hover:scale-105"
			>
				Start Generating Free
			</button>
			<a
				href="/gallery"
				class="rounded-full border border-white/20 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
			>
				View Gallery
			</a>
		</div>
	</div>
</section>
