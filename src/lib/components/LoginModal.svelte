<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import loginBg from '$lib/assets/login-bg.png';
	import { auth } from '$lib/stores/auth';

	let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

	function handleOutsideClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function toLogin() {
		onClose();
		auth.login(); // Mock login immediately for demo
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={handleOutsideClick}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOutsideClick(e as any)}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-seko-bg shadow-2xl"
			transition:scale={{ duration: 300, start: 0.95 }}
		>
			<!-- Background decoration -->
			<div class="absolute inset-0 z-0">
				<img src={loginBg} alt="" class="h-full w-full object-cover opacity-30" />
				<div class="absolute inset-0 bg-gradient-to-b from-seko-bg/80 to-seko-bg"></div>
			</div>

			<div class="relative z-10 p-8">
				<div class="mb-8 text-center">
					<div class="mb-4 inline-flex items-center gap-2">
						<div class="h-8 w-8 rotate-3 rounded-lg bg-seko-accent"></div>
						<span class="text-2xl font-bold text-white">JeweAI</span>
					</div>
					<h2 class="mb-2 text-2xl font-bold text-white">Welcome Back</h2>
					<p class="text-sm text-gray-400">Sign in to continue creating stunning ads</p>
				</div>

				<div class="space-y-4">
					<button
						class="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-bold text-black transition-colors hover:bg-gray-100"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Continue with Google
					</button>

					<div class="relative flex items-center py-2">
						<div class="flex-grow border-t border-white/10"></div>
						<span class="mx-4 flex-shrink-0 text-xs text-gray-500 uppercase">Or</span>
						<div class="flex-grow border-t border-white/10"></div>
					</div>

					<form class="space-y-4" onsubmit={(e) => e.preventDefault()}>
						<div>
							<label for="email" class="mb-1 block text-sm font-medium text-gray-400"
								>Email address</label
							>
							<input
								type="email"
								id="email"
								class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 transition-all focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
								placeholder="name@company.com"
							/>
						</div>
						<button
							onclick={toLogin}
							type="submit"
							class="hover:bg-opacity-90 w-full rounded-xl bg-seko-accent px-4 py-3 font-bold text-black shadow-[0_0_15px_rgba(163,230,53,0.2)] transition-colors"
						>
							Sign In with Email
						</button>
					</form>
				</div>

				<div class="mt-6 text-center text-sm text-gray-500">
					By continuing, you agree to our <a href="/terms" class="text-white hover:underline"
						>Terms of Service</a
					>
					and
					<a href="/privacy" class="text-white hover:underline">Privacy Policy</a>.
				</div>
			</div>

			<!-- Close button -->
			<button
				class="absolute top-4 right-4 z-50 p-2 text-gray-400 transition-colors hover:text-white"
				onclick={onClose}
				aria-label="Close modal"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg
				>
			</button>
		</div>
	</div>
{/if}
