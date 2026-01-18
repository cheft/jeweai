<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { client } from '$lib/orpc';
	let { children } = $props();

	onMount(async () => {
		const token = localStorage.getItem('token');
		if (token) {
			try {
				const user = await client.user.me();
				if (user) {
					auth.login(user);
				} else {
					localStorage.removeItem('token');
				}
			} catch (e) {
				console.error('Failed to fetch user:', e);
				localStorage.removeItem('token');
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col bg-seko-bg font-sans text-seko-text">
	<Header />
	<main class="flex-grow pt-16">
		{@render children()}
	</main>
	<Footer />
</div>
