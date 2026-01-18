<script lang="ts">
	import { Globe, User, LogOut, ChevronDown, CreditCard, Sparkles } from 'lucide-svelte';
	import LoginModal from './LoginModal.svelte';
	import { auth } from '$lib/stores/auth';
	import { fade, scale } from 'svelte/transition';

	let isLoginOpen = $state(false);
	let isDropdownOpen = $state(false);

	function handleLogout() {
		auth.logout();
		isDropdownOpen = false;
	}

	function handleLogin() {
		isLoginOpen = true;
	}

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
	}

	// Close dropdown when clicking outside
	function handleOutsideClick(e: MouseEvent) {
		if (isDropdownOpen) {
			isDropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleOutsideClick} />

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
				<!-- Logged In State with Dropdown -->
				<div class="relative">
					<button
						class="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pr-2 pl-3 transition-all hover:bg-white/10"
						onclick={(e) => {
							e.stopPropagation();
							toggleDropdown();
						}}
					>
						<div class="mr-1 flex flex-col items-end text-[10px] leading-tight">
							<span class="font-bold text-white uppercase italic">{$auth.name}</span>
							<span class="text-seko-accent">{$auth.credits} Credits</span>
						</div>
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-seko-accent font-bold text-black"
						>
							{$auth.name?.charAt(0).toUpperCase()}
						</div>
						<ChevronDown
							size={14}
							class="text-gray-400 transition-transform {isDropdownOpen ? 'rotate-180' : ''}"
						/>
					</button>

					{#if isDropdownOpen}
						<div
							class="ring-opacity-5 absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl ring-1 ring-black focus:outline-none"
							transition:scale={{ duration: 150, start: 0.95 }}
						>
							<div class="space-y-1 p-2">
								<div class="mb-1 border-b border-white/5 px-3 py-2">
									<p class="text-xs text-gray-500">Signed in as</p>
									<p class="truncate text-sm font-medium text-white">{$auth.email}</p>
								</div>

								<a
									href="/pricing"
									class="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
									onclick={() => (isDropdownOpen = false)}
								>
									<Sparkles size={16} class="text-seko-accent" />
									<span>My Plan</span>
									<span
										class="ml-auto rounded-md bg-seko-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-seko-accent uppercase transition-colors group-hover:bg-seko-accent group-hover:text-black"
									>
										{$auth.plan}
									</span>
								</a>

								<a
									href="/billing"
									class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
									onclick={() => (isDropdownOpen = false)}
								>
									<CreditCard size={16} />
									<span>Credits Tracking</span>
									<span class="ml-auto text-xs font-medium text-gray-500">{$auth.credits}</span>
								</a>

								<div class="my-1 h-px bg-white/5"></div>

								<button
									class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
									onclick={handleLogout}
								>
									<LogOut size={16} />
									<span>Log Out</span>
								</button>
							</div>
						</div>
					{/if}
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
