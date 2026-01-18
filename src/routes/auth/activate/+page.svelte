<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { client } from '$lib/orpc';
	import { auth } from '$lib/stores/auth';
	import { fade, scale } from 'svelte/transition';
	import loginBg from '$lib/assets/login-bg.png';

	let email = $state(page.url.searchParams.get('email') || '');
	let token = $state(page.url.searchParams.get('token') || '');

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	async function handleActivate() {
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}
		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		loading = true;
		error = '';

		try {
			const { user, token: sessionToken } = await client.auth.activate({
				email,
				token,
				password
			});

			if (user) {
				localStorage.setItem('token', sessionToken);
				auth.login(); // Update store
				success = true;
				// Redirect after a short delay
				setTimeout(() => {
					window.location.href = '/';
				}, 2000);
			}
		} catch (e: any) {
			error = e.message || 'Activation failed. The link may have expired.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Activate Account | JeweAI</title>
</svelte:head>

<div
	class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-seko-bg p-4"
>
	<!-- Background Decor -->
	<div class="absolute inset-0 z-0">
		<img src={loginBg} alt="" class="h-full w-full object-cover opacity-30" />
		<div class="absolute inset-0 bg-gradient-to-b from-seko-bg/80 to-seko-bg"></div>
	</div>

	<div
		class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-seko-bg/40 p-8 shadow-2xl backdrop-blur-xl"
		in:scale={{ duration: 400, start: 0.9 }}
	>
		<div class="mb-8 text-center">
			<div class="mb-4 inline-flex items-center gap-2">
				<div
					class="h-8 w-8 rotate-3 rounded-lg bg-seko-accent shadow-[0_0_15px_rgba(163,230,53,0.3)]"
				></div>
				<span class="text-2xl font-bold tracking-tight text-white">JeweAI</span>
			</div>

			{#if success}
				<h2 class="mb-2 text-2xl font-bold text-white">Account Activated!</h2>
				<p class="text-sm text-gray-400">Welcome to JeweAI. Redirecting you to the dashboard...</p>
			{:else}
				<h2 class="mb-2 text-2xl font-bold text-white">Activate Your Account</h2>
				<p class="text-sm text-gray-400">
					Set a password for <span class="font-medium text-white">{email}</span> to get started.
				</p>
			{/if}
		</div>

		{#if success}
			<div class="flex justify-center py-8" in:fade>
				<div class="animate-pulse rounded-full bg-seko-accent/10 p-6">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-16 w-16 text-seko-accent"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			</div>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleActivate();
				}}
				class="space-y-5"
			>
				<div class="space-y-2">
					<label for="password" class="block text-sm font-medium text-gray-400">New Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						disabled={loading}
						placeholder="••••••••"
						class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 transition-all focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
						required
					/>
				</div>

				<div class="space-y-2">
					<label for="confirm" class="block text-sm font-medium text-gray-400"
						>Confirm Password</label
					>
					<input
						type="password"
						id="confirm"
						bind:value={confirmPassword}
						disabled={loading}
						placeholder="••••••••"
						class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 transition-all focus:border-seko-accent focus:ring-1 focus:ring-seko-accent focus:outline-none"
						required
					/>
				</div>

				{#if error}
					<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-start" in:fade>
						<p class="text-xs leading-relaxed font-medium text-red-500">{error}</p>
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading || !password || !confirmPassword}
					class="group relative flex w-full items-center justify-center rounded-xl bg-seko-accent px-4 py-3.5 font-bold text-black shadow-[0_4px_15px_rgba(163,230,53,0.3)] transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_25px_rgba(163,230,53,0.4)] disabled:translate-y-0 disabled:opacity-50"
				>
					{#if loading}
						<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Activating...
					{:else}
						Activate Account
					{/if}
				</button>
			</form>
		{/if}

		<div class="mt-8 text-center text-xs text-gray-500">
			Secure activation powered by JeweAI. By activating, you agree to our
			<a href="/terms" class="mx-1 text-white hover:underline">Terms</a> and
			<a href="/privacy" class="mx-1 text-white hover:underline">Privacy</a>.
		</div>
	</div>
</div>

<style>
	/* Custom styles if needed, but Tailwind should handle most */
</style>
