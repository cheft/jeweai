<script lang="ts">
	import { Globe, User, LogOut } from 'lucide-svelte';
	import LoginModal from './LoginModal.svelte';
	import { auth } from '$lib/stores/auth';

	let isLoginOpen = $state(false);

	function handleLogout() {
		auth.logout();
	}

	function handleLogin() {
		// auth.login(); // Mock login immediately for demo
		isLoginOpen = true; // For real flow
	}
</script>

<header
	class="fixed top-0 left-0 z-50 w-full border-b border-white/5 bg-seko-bg/80 backdrop-blur-md"
>
	<div class="container mx-auto flex h-16 items-center justify-between px-4">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 text-2xl font-bold tracking-tighter">
			<div class="h-8 w-8 rotate-3 rounded-lg bg-seko-accent"></div>
			JeweAI
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
			<a
				href="/timeline"
				class="text-sm font-medium text-gray-300 transition-colors hover:text-white">Timeline</a
			>
			<a
				href="/pricing"
				class="text-sm font-medium text-gray-300 transition-colors hover:text-white">Pricing</a
			>
			<a href="/about" class="text-sm font-medium text-gray-300 transition-colors hover:text-white"
				>About</a
			>
		</nav>

		<!-- Auth Buttons -->
		<div class="flex items-center gap-4">
			{#if $auth}
				<!-- Logged In State -->
				<div class="flex items-center gap-4">
					<div class="flex flex-col items-end text-xs">
						<span class="font-bold text-white">{$auth.name}</span>
						<span class="text-seko-accent">{$auth.credits} Credits</span>
					</div>
					<a
						href="/billing"
						class="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
						title="Billing"
					>
						<User size={20} />
					</a>
					<button class="text-gray-400 hover:text-white" onclick={handleLogout} title="Log Out">
						<LogOut size={20} />
					</button>
				</div>
			{:else}
				<button
					class="text-sm font-medium text-white transition-colors hover:text-seko-accent"
					onclick={handleLogin}
				>
					Log In
				</button>
				<button
					class="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200"
					onclick={handleLogin}
				>
					Get Started
				</button>
			{/if}
		</div>
	</div>
</header>

<LoginModal isOpen={isLoginOpen} onClose={() => (isLoginOpen = false)} />
