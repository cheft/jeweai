<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { client } from '$lib/orpc';
	import { auth } from '$lib/stores/auth';
	import {
		Coins,
		History,
		Video,
		Image as ImageIcon,
		ArrowUpRight,
		ArrowDownRight,
		Gift,
		CreditCard,
		ShoppingCart
	} from 'lucide-svelte';

	let history = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await client.user.getCreditsHistory();
			history = res;
		} catch (e) {
			console.error('Failed to fetch credits history:', e);
		} finally {
			loading = false;
		}
	});

	function formatDate(timestamp: number) {
		return new Date(timestamp).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const conversionRates = [
		{ type: 'AI Video', cost: 3, icon: Video, color: 'text-seko-accent' },
		{ type: 'AI Photo', cost: 1, icon: ImageIcon, color: 'text-blue-400' }
	];
</script>

<svelte:head>
	<title>My Credits | JeweAI</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-12">
	<!-- Header Section -->
	<div class="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
		<div>
			<h1 class="text-3xl font-bold text-white md:text-4xl">Credit Balance</h1>
			<p class="mt-2 text-gray-400">Manage your credits and view your usage history</p>
		</div>
		<a
			href="/prices"
			class="flex items-center gap-2 rounded-xl bg-seko-accent px-6 py-3 font-bold text-black transition-transform hover:scale-105"
		>
			<ShoppingCart class="h-5 w-5" />
			Buy More Credits
		</a>
	</div>

	<!-- Stats Grid -->
	<div class="mb-12 grid gap-6 md:grid-cols-3">
		<!-- Current Balance -->
		<div class="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
			<div class="mb-4 flex items-center justify-between">
				<div class="rounded-2xl bg-seko-accent/20 p-3 text-seko-accent">
					<Coins class="h-6 w-6" />
				</div>
				<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">Available</span>
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-5xl font-black text-white">{$auth?.credits ?? 0}</span>
				<span class="text-lg font-medium text-gray-400">Credits</span>
			</div>
			<p class="mt-4 text-sm text-gray-500">Regularly updated balance</p>
		</div>

		<!-- Usage Guide -->
		{#each conversionRates as item}
			<div class="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
				<div class="mb-4 flex items-center justify-between">
					<div class="rounded-2xl bg-white/5 p-3 {item.color}">
						<item.icon class="h-6 w-6" />
					</div>
					<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">Conversion</span>
				</div>
				<div class="flex items-center gap-3">
					<span class="text-4xl font-bold text-white"
						>{Math.floor(($auth?.credits ?? 0) / item.cost)}</span
					>
					<span class="text-lg text-gray-400">{item.type}s left</span>
				</div>
				<p class="mt-4 text-sm text-gray-400">
					Consumed <span class="font-bold text-white"
						>{item.cost} credit{item.cost > 1 ? 's' : ''}</span
					> per generation
				</p>
			</div>
		{/each}
	</div>

	<!-- History Section -->
	<div class="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
		<div class="flex items-center gap-3 border-b border-white/10 p-6">
			<History class="h-5 w-5 text-seko-accent" />
			<h2 class="text-xl font-bold text-white">Transaction History</h2>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left">
				<thead>
					<tr class="text-xs font-medium tracking-wider text-gray-500 uppercase">
						<th class="px-6 py-4">Transaction Details</th>
						<th class="px-6 py-4">Type</th>
						<th class="px-6 py-4 text-right">Amount</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					{#if loading}
						{#each Array(3) as _}
							<tr class="animate-pulse">
								<td class="px-6 py-4">
									<div class="h-4 w-48 rounded bg-white/10"></div>
									<div class="mt-2 h-3 w-32 rounded bg-white/5"></div>
								</td>
								<td class="px-6 py-4"><div class="h-4 w-20 rounded bg-white/10"></div></td>
								<td class="px-6 py-4 text-right"
									><div class="ml-auto h-4 w-12 rounded bg-white/10"></div></td
								>
							</tr>
						{/each}
					{:else if history.length === 0}
						<tr>
							<td colspan="3" class="px-6 py-12 text-center text-gray-500">
								No transaction history found.
							</td>
						</tr>
					{:else}
						{#each history as item (item.id)}
							<tr class="transition-colors hover:bg-white/[0.02]" transition:slide>
								<td class="px-6 py-4">
									<div class="font-medium text-white">{item.description}</div>
									<div class="text-xs text-gray-500">{formatDate(item.createdAt)}</div>
								</td>
								<td class="px-6 py-4">
									<span class="inline-flex items-center gap-1 text-sm text-gray-400 capitalize">
										{#if item.type === 'consumption'}
											<ArrowDownRight class="h-4 w-4 text-red-400" />
											Consumption
										{:else if item.type === 'reward'}
											<Gift class="h-4 w-4 text-seko-accent" />
											Reward
										{:else}
											<CreditCard class="h-4 w-4 text-blue-400" />
											Purchase
										{/if}
									</span>
								</td>
								<td class="px-6 py-4 text-right">
									<span
										class="text-lg font-bold {item.amount > 0 ? 'text-seko-accent' : 'text-white'}"
									>
										{item.amount > 0 ? '+' : ''}{item.amount}
									</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.container {
		min-height: calc(100vh - 4rem);
	}
</style>
