<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import {
		MapPin,
		Users,
		Cpu,
		MessageSquare,
		Send,
		CheckCircle2,
		Globe2,
		Award,
		Sparkles
	} from 'lucide-svelte';

	let formStatus = $state<'idle' | 'submitting' | 'success'>('idle');
	let formData = $state({ name: '', email: '', message: '' });

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		formStatus = 'submitting';
		// Simulate API call
		await new Promise((r) => setTimeout(r, 1500));
		formStatus = 'success';
		formData = { name: '', email: '', message: '' };
		setTimeout(() => (formStatus = 'idle'), 3000);
	}

	const technologies = [
		{
			name: 'Sora 2',
			desc: 'World-leading video generation model for hyper-realistic jewelry commercials.',
			icon: Sparkles,
			color: 'text-seko-accent'
		},
		{
			name: 'Google Nano Banana Pro',
			desc: 'Precision-engineered image models optimized for jewelry textures and lighting.',
			icon: Cpu,
			color: 'text-blue-400'
		}
	];

	const locations = [
		{
			city: 'Shenzhen (Shuibei), China',
			team: 'Supply Chain & Manufacturing',
			desc: "Located in the heart of the world's jewelry capital for unparalleled industry grounding."
		},
		{
			city: 'Los Angeles, USA',
			team: 'Design & Strategy',
			desc: 'Our creative hub connecting global trends with Silicon Valley innovation.'
		}
	];
</script>

<svelte:head>
	<title>About Us | JeweAI</title>
</svelte:head>

<div class="relative overflow-hidden bg-black text-white">
	<!-- Hero Section -->
	<section class="relative flex min-h-[70vh] items-center justify-center pt-20">
		<div class="absolute inset-0 z-0">
			<img
				src="/images/about/hero.png"
				alt="AI Jewelry Craftsmanship"
				class="h-full w-full object-cover opacity-40 grayscale-[0.2]"
			/>
			<div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black"></div>
		</div>

		<div class="relative z-10 container px-4 text-center">
			<div in:fly={{ y: 30, duration: 800 }} class="mx-auto max-w-4xl">
				<span
					class="mb-4 inline-block rounded-full border border-seko-accent/30 bg-seko-accent/10 px-4 py-1.5 text-xs font-bold tracking-widest text-seko-accent uppercase"
				>
					Global Innovation & Heritage
				</span>
				<h1 class="mb-6 text-5xl font-black md:text-7xl">
					Merging Silicon Valley <br />
					<span class="text-seko-accent">with Shuibei Craft</span>
				</h1>
				<p class="mx-auto max-w-2xl text-lg text-gray-300 md:text-xl">
					A collaborative feat by American Chinese innovators and Shenzhen's master jewelers,
					redefining high-end advertising through AI.
				</p>
			</div>
		</div>
	</section>

	<!-- Team Section -->
	<section class="container mx-auto px-4 py-24">
		<div class="grid gap-16 lg:grid-cols-2">
			<div>
				<h2 class="mb-8 text-3xl font-bold md:text-4xl">Our Mission</h2>
				<p class="mb-6 text-xl leading-relaxed text-gray-400">
					Built by a team of US-based Chinese professionals and domestic experts, JeweAI bridges the
					gap between decades of jewelry industry wisdom and cutting-edge software engineering.
				</p>
				<div class="mt-12 grid gap-8 sm:grid-cols-2">
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
						<Users class="mb-4 h-8 w-8 text-seko-accent" />
						<h3 class="mb-2 font-bold text-white">Dual Heritage</h3>
						<p class="text-sm text-gray-400">
							Los Angeles and Shenzhen teams working in perfect synchronization.
						</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
						<Award class="mb-4 h-8 w-8 text-seko-accent" />
						<h3 class="mb-2 font-bold text-white">Industry Wisdom</h3>
						<p class="text-sm text-gray-400">
							Decades of jewelry experience combined with product design excellence.
						</p>
					</div>
				</div>
			</div>

			<!-- Locations List -->
			<div class="space-y-6">
				{#each locations as loc}
					<div
						class="group rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-seko-accent/30 hover:bg-white/[0.05]"
					>
						<div class="mb-2 flex items-center gap-3">
							<MapPin class="h-6 w-6 text-seko-accent" />
							<h3 class="text-2xl font-black text-white">{loc.city}</h3>
						</div>
						<p class="mb-4 text-xs font-bold tracking-wider text-seko-accent uppercase">
							{loc.team}
						</p>
						<p class="text-gray-400">{loc.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Technology Stack -->
	<section class="bg-white/5 py-24">
		<div class="container mx-auto px-4 text-center">
			<h2 class="mb-16 text-3xl font-bold md:text-4xl">Uncompromising Technology</h2>
			<div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
				{#each technologies as tech}
					{@const Icon = tech.icon}
					<div
						class="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 p-10 text-left transition-transform hover:-translate-y-2"
					>
						<div class="mb-6 inline-flex rounded-2xl bg-white/5 p-4 {tech.color}">
							<Icon class="h-8 w-8" />
						</div>
						<h3 class="mb-4 text-2xl font-bold text-white">{tech.name}</h3>
						<p class="leading-relaxed text-gray-400">{tech.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Shuibei Map Section -->
	<section class="container mx-auto px-4 py-32">
		<div class="flex flex-col items-center gap-16 lg:flex-row">
			<div class="w-full lg:w-1/2">
				<h2 class="mb-6 text-4xl font-bold">The Heart of Jewelry</h2>
				<p class="mb-8 text-xl text-gray-400">
					Shenzhen Shuibei is the pulsating heart of the global jewelry supply chain. Our presence
					here allows us to capture the essence of every gemstone and every metal finish with
					pixel-perfect accuracy.
				</p>
				<ul class="space-y-4 text-gray-300">
					<li class="flex items-center gap-3">
						<CheckCircle2 class="h-5 w-5 text-seko-accent" />
						Direct access to raw materials and craftsmanship knowledge.
					</li>
					<li class="flex items-center gap-3">
						<CheckCircle2 class="h-5 w-5 text-seko-accent" />
						Real-time observation of lighting on high-end jewelry.
					</li>
					<li class="flex items-center gap-3">
						<CheckCircle2 class="h-5 w-5 text-seko-accent" />
						Deep roots in the most advanced jewelry market.
					</li>
				</ul>
			</div>

			<!-- Interactive Map Visualization (Stylized SVG) -->
			<div class="relative flex w-full justify-center lg:w-1/2">
				<div
					class="relative h-[400px] w-full max-w-[500px] overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-4 backdrop-blur-md"
				>
					<svg viewBox="0 0 400 300" class="h-full w-full">
						<defs>
							<radialGradient id="highlight" cx="50%" cy="50%" r="50%">
								<stop offset="0%" stop-color="#BC9D75" stop-opacity="0.4" />
								<stop offset="100%" stop-color="#BC9D75" stop-opacity="0" />
							</radialGradient>
						</defs>
						<!-- Stylized Map Abstract Grids -->
						<g class="fill-none stroke-white/20 opacity-20" stroke-width="0.5">
							{#each Array(15) as _, i}
								<line x1={i * 30} y1="0" x2={i * 30} y2="300" />
								<line x1="0" y1={i * 20} x2="400" y2={i * 20} />
							{/each}
						</g>
						<!-- Roads/Layout -->
						<path
							d="M50 250 L150 250 L150 50 M150 150 L350 150"
							stroke="white"
							stroke-width="2"
							stroke-opacity="0.2"
							fill="none"
						/>
						<!-- Shuibei Point -->
						<circle cx="150" cy="150" r="40" fill="url(#highlight)">
							<animate attributeName="r" values="30;50;30" dur="4s" repeatCount="indefinite" />
						</circle>
						<circle cx="150" cy="150" r="10" fill="#BC9D75">
							<animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
						</circle>
						<text
							x="170"
							y="140"
							fill="white"
							class="text-md font-bold"
							filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))">SHUIBEI</text
						>
						<text
							x="170"
							y="160"
							fill="#BC9D75"
							class="text-[10px] font-bold tracking-widest uppercase">Jewelry Epicenter</text
						>
					</svg>
					<!-- Floating Labels -->
					<div
						class="absolute bottom-10 left-10 rounded-xl border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md"
					>
						<p class="text-[10px] font-bold tracking-tighter text-gray-400 uppercase">
							Coordinates
						</p>
						<p class="font-mono text-xs text-white">22.5694° N, 114.1264° E</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Feedback Section -->
	<section class="bg-[#050505] py-32" id="feedback">
		<div class="container mx-auto max-w-4xl px-4 text-center">
			<MessageSquare class="mx-auto mb-6 h-12 w-12 text-seko-accent" />
			<h2 class="mb-4 text-4xl font-bold">Your Vision, Our Mission</h2>
			<p class="mb-12 text-gray-400">
				We value your feedback and suggestions. Help us shape the future of AI jewelry advertising.
			</p>

			<form
				class="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 text-left backdrop-blur-md"
				onsubmit={handleSubmit}
			>
				{#if formStatus === 'success'}
					<div
						in:fade
						class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-8 text-center"
					>
						<CheckCircle2 class="mb-4 h-16 w-16 text-seko-accent" />
						<h3 class="text-2xl font-bold">Suggestion Sent!</h3>
						<p class="mt-2 text-gray-400">
							Thank you for helping us grow. Our team will review your message soon.
						</p>
					</div>
				{/if}

				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<label for="name" class="text-sm font-bold tracking-wider text-gray-500 uppercase"
							>Your Name</label
						>
						<input
							type="text"
							id="name"
							bind:value={formData.name}
							required
							placeholder="John Doe"
							class="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
						/>
					</div>
					<div class="space-y-2">
						<label for="email" class="text-sm font-bold tracking-wider text-gray-500 uppercase"
							>Email Address</label
						>
						<input
							type="email"
							id="email"
							bind:value={formData.email}
							required
							placeholder="john@example.com"
							class="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
						/>
					</div>
				</div>
				<div class="mt-6 space-y-2">
					<label for="message" class="text-sm font-bold tracking-wider text-gray-500 uppercase"
						>Your Message</label
					>
					<textarea
						id="message"
						bind:value={formData.message}
						required
						rows="4"
						placeholder="How can we improve?"
						class="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
					></textarea>
				</div>
				<button
					type="submit"
					disabled={formStatus === 'submitting'}
					class="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-seko-accent py-4 text-lg font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-50"
				>
					{#if formStatus === 'submitting'}
						<div
							class="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"
						></div>
						Processing...
					{:else}
						<Send class="h-5 w-5" />
						Send Feedback
					{/if}
				</button>
			</form>
		</div>
	</section>

	<!-- Footer Link Placeholder -->
	<section class="border-t border-white/5 py-12 text-center">
		<p class="text-sm text-gray-500 italic">
			"Bridging technology and tradition for the next generation of jewelers."
		</p>
	</section>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
