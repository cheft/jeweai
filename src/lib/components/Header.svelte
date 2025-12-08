<script lang="ts">
	import { Globe, User } from 'lucide-svelte';
	import LoginModal from './LoginModal.svelte';

	let isLoginOpen = $state(false);
</script>

<header
	class="fixed top-0 left-0 z-50 w-full border-b border-white/5 bg-seko-bg/80 backdrop-blur-md"
>
	<div class="container mx-auto flex h-16 items-center justify-between px-4">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 text-2xl font-bold tracking-tighter">
			<div class="h-8 w-8 rotate-3 rounded-lg bg-seko-accent"></div>
			JewelAI
		</a>

		<!-- Navigation -->
		<nav class="hidden items-center gap-8 md:flex">
			<a
				href="/gallery"
				class="text-sm font-medium text-gray-300 transition-colors hover:text-white">Gallery</a
			>
			<a href="/assets" class="text-sm font-medium text-gray-300 transition-colors hover:text-white"
				>Assets</a
			>
			<a href="#" class="text-sm font-medium text-gray-300 transition-colors hover:text-white"
				>Pricing</a
			>
			<a href="#" class="text-sm font-medium text-gray-300 transition-colors hover:text-white"
				>About</a
			>
		</nav>

		<!-- Auth Buttons -->
		<div class="flex items-center gap-4">
			<button
				class="text-sm font-medium text-white transition-colors hover:text-seko-accent"
				onclick={() => (isLoginOpen = true)}
			>
				Log In
			</button>
			<button
				class="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200"
				onclick={() => (isLoginOpen = true)}
			>
				Get Started
			</button>
		</div>
	</div>
</header>

<LoginModal isOpen={isLoginOpen} onClose={() => (isLoginOpen = false)} />
