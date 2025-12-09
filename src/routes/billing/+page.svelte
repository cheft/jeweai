<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import AddCardModal from '$lib/components/billing/AddCardModal.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	// Mock Invoice Data
	let invoices: any[] = $state([
		{ id: 'inv_1', date: '2024-11-01', amount: '$399.00', status: 'Paid', plan: 'Growth' },
		{ id: 'inv_2', date: '2024-10-01', amount: '$399.00', status: 'Paid', plan: 'Growth' }
	]);

	onMount(() => {
		if (!$auth) {
			goto('/');
			return;
		}

		// Handle Success Redirect from Checkout
		const status = $page.url.searchParams.get('status');
		const newPlan = $page.url.searchParams.get('plan');
		const cycle = $page.url.searchParams.get('cycle');

		if (status === 'success' && newPlan) {
			// Update Mock Store
			// In production, this would be handled by webhook or server-side verification
			auth.setPlan(newPlan as any, cycle as any);
			auth.addCredits(newPlan === 'scale' ? 1200 : 600);

			// Add new invoice to history mock
			const price =
				newPlan === 'growth'
					? cycle === 'monthly'
						? '$399.00'
						: '$3299.00'
					: cycle === 'monthly'
						? '$599.00'
						: '$4299.00';
			invoices = [
				{
					id: 'inv_' + Math.random().toString(36).substr(2, 5),
					date: new Date().toISOString().split('T')[0],
					amount: price,
					status: 'Paid',
					plan: newPlan.charAt(0).toUpperCase() + newPlan.slice(1)
				},
				...invoices
			];

			// Cleanup URL
			window.history.replaceState({}, '', '/billing');
		}
	});

	function handleManageSubscription() {
		alert('Redirecting to Stripe Customer Portal...');
	}

	let isAddCardOpen = $state(false);

	function handleAddCard(details: any) {
		auth.addPaymentMethod(details);
		isAddCardOpen = false;
	}
</script>

<div class="min-h-screen pt-24 pb-20">
	<div class="container mx-auto max-w-5xl px-6">
		<h1 class="mb-8 text-3xl font-bold text-white">Billing & Subscription</h1>

		{#if $auth}
			<div class="grid gap-8 md:grid-cols-2">
				<!-- Current Plan Card -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Current Plan</h2>
						<span
							class="rounded-full bg-seko-accent px-3 py-1 text-xs font-bold text-black uppercase"
						>
							{$auth.plan}
						</span>
					</div>

					<div class="mb-6">
						<div class="text-4xl font-bold text-white">{$auth.credits}</div>
						<div class="text-sm text-gray-400">Available Credits</div>
					</div>

					<div class="mb-6 space-y-2 text-sm text-gray-300">
						<div class="flex justify-between">
							<span>Billing Cycle</span>
							<span class="text-white capitalize">{$auth.billingCycle}</span>
						</div>
						<div class="flex justify-between">
							<span>Next Invoice</span>
							<span class="text-white">Jan 01, 2025</span>
						</div>
					</div>

					<div class="flex gap-4">
						<button
							class="flex-1 rounded-lg bg-white/10 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
							onclick={handleManageSubscription}
						>
							Manage Subscription
						</button>
						<button
							class="flex-1 rounded-lg border border-seko-accent/50 py-2 text-sm font-medium text-seko-accent transition-colors hover:bg-seko-accent hover:text-black"
							onclick={() => goto('/pricing')}
						>
							Upgrade Plan
						</button>
					</div>
				</div>

				<!-- Payment Methods Card -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Payment Methods</h2>
						<button
							class="text-sm font-bold text-seko-accent hover:underline"
							onclick={() => (isAddCardOpen = true)}
						>
							+ Add Card
						</button>
					</div>

					<div class="space-y-4">
						{#each $auth.paymentMethods as pm (pm.id)}
							<div
								class="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-4"
							>
								<div class="flex items-center gap-4">
									<div
										class="flex h-10 w-16 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white uppercase"
									>
										{pm.brand}
									</div>
									<div>
										<div class="text-sm font-bold text-white">•••• •••• •••• {pm.last4}</div>
										<div class="text-xs text-gray-400">Expires {pm.expMonth}/{pm.expYear}</div>
									</div>
								</div>

								<div class="flex items-center gap-2">
									{#if pm.isDefault}
										<span class="rounded bg-gray-700 px-2 py-0.5 text-[10px] text-white"
											>Default</span
										>
									{:else}
										<button
											class="text-xs text-gray-400 hover:text-white"
											onclick={() => auth.setDefaultPaymentMethod(pm.id)}
										>
											Set Default
										</button>
										<button
											class="text-xs text-red-400 hover:text-red-300"
											onclick={() => {
												if (confirm('Remove this card?')) auth.removePaymentMethod(pm.id);
											}}
										>
											Remove
										</button>
									{/if}
								</div>
							</div>
						{/each}

						{#if $auth.paymentMethods.length === 0}
							<div class="text-center text-sm text-gray-500">No payment methods added.</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Add Card Modal -->
			{#if isAddCardOpen}
				<AddCardModal onAdd={handleAddCard} onCancel={() => (isAddCardOpen = false)} />
			{/if}

			<!-- Invoice History -->
			<div class="mt-12">
				<h2 class="mb-6 text-2xl font-bold text-white">Invoice History</h2>
				<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
					<table class="w-full text-left text-sm text-gray-300">
						<thead class="bg-white/5 text-xs text-gray-400 uppercase">
							<tr>
								<th class="px-6 py-4">Date</th>
								<th class="px-6 py-4">Plan</th>
								<th class="px-6 py-4">Amount</th>
								<th class="px-6 py-4">Status</th>
								<th class="px-6 py-4 text-right">Invoice</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5">
							{#each invoices as invoice}
								<tr class="hover:bg-white/5">
									<td class="px-6 py-4">{invoice.date}</td>
									<td class="px-6 py-4">{invoice.plan}</td>
									<td class="px-6 py-4">{invoice.amount}</td>
									<td class="px-6 py-4">
										<span class="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
											{invoice.status}
										</span>
									</td>
									<td class="px-6 py-4 text-right">
										<button class="text-gray-400 hover:text-white">Download</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>
