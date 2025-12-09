<script lang="ts">
	import PricingCard from '$lib/components/pricing/PricingCard.svelte';
	import { auth } from '$lib/stores/auth';
	import { fade, fly } from 'svelte/transition';

	let billingCycle = $state<'monthly' | 'yearly'>('monthly');

	// Pricing Data
	// Free: $0, 10 Credits (one time)
	// Growth: $399/mo or $3299/yr (30% off). 600 Credits/mo
	// Scale: $599/mo or $4299/yr (40% off). 1200 Credits/mo

	const pricingData = $derived([
		{
			title: 'Free',
			price: 0,
			credits: 10,
			period: 'one-time', // No reset
			features: [
				'10 Credits for trial',
				'Never resets',
				'Access to standard models',
				'Community support'
			],
			buttonText: 'Start for Free'
		},
		{
			title: 'Growth',
			price: billingCycle === 'monthly' ? 399 : 3299,
			credits: 600,
			period: billingCycle === 'monthly' ? 'month' : 'year',
			highlight: true,
			features: [
				'600 Credits / month',
				'Monthly reset',
				'Fast generation',
				'Priority support',
				billingCycle === 'yearly' ? 'Save ~30%' : null
			].filter(Boolean) as string[],
			buttonText: 'Subscribe Growth'
		},
		{
			title: 'Scale',
			price: billingCycle === 'monthly' ? 599 : 4299,
			credits: 1200,
			period: billingCycle === 'monthly' ? 'month' : 'year',
			features: [
				'1200 Credits / month',
				'Monthly reset',
				'Fastest generation',
				'Dedicated support',
				billingCycle === 'yearly' ? 'Save ~40%' : null
			].filter(Boolean) as string[],
			buttonText: 'Subscribe Scale'
		}
	]);
</script>

<div class="min-h-screen pt-20 pb-20">
	<div class="container mx-auto px-6">
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-white md:text-5xl">Simple Pricing</h1>
			<p class="mx-auto max-w-2xl text-lg text-gray-400">
				Choose the plan that fits your needs.
				<br />
				<span class="text-seko-accent">1 Credit = 1 Image</span> |
				<span class="text-seko-accent">3 Credits = 1 Video</span>
			</p>

			<!-- Billing Toggle -->
			<div class="mt-8 flex justify-center">
				<div class="flex items-center rounded-full border border-white/10 bg-white/5 p-1">
					<button
						class="rounded-full px-6 py-2 text-sm font-bold transition-all
                        {billingCycle === 'monthly'
							? 'bg-white text-black shadow-lg'
							: 'text-gray-400 hover:text-white'}"
						onclick={() => (billingCycle = 'monthly')}
					>
						Monthly
					</button>
					<button
						class="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all
                        {billingCycle === 'yearly'
							? 'bg-white text-black shadow-lg'
							: 'text-gray-400 hover:text-white'}"
						onclick={() => (billingCycle = 'yearly')}
					>
						Yearly
						<span class="rounded bg-seko-accent px-1.5 py-0.5 text-[10px] text-black"> -30% </span>
					</button>
				</div>
			</div>
		</div>

		<!-- Pricing Grid -->
		<div
			class="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 md:gap-12"
			in:fly={{ y: 20, duration: 800, delay: 200 }}
		>
			{#each pricingData as plan}
				<PricingCard
					title={plan.title}
					price={plan.price}
					period={plan.period}
					credits={plan.credits}
					features={plan.features}
					highlight={plan.highlight}
					buttonText={plan.buttonText}
					onSubscribe={() => {
						if (plan.title === 'Free') return; // Access granted

						if (!$auth) {
							// For demo: auto-login or prompt
							if (confirm("You need to be logged in. Log in as Demo User?")) {
								import('$lib/stores/auth').then(({ auth }) => auth.login());
							} else {
								return;
							}
						}
						
						// Redirect to checkout
						import('$app/navigation').then(({ goto }) => {
							goto(`/checkout?plan=${plan.title.toLowerCase()}&cycle=${billingCycle}`);
						});
					}}
				/>
			{/each}
		</div>

		<div class="mt-20 text-center text-sm text-gray-500">
			<p>Prices are in USD. Tax may apply.</p>
		</div>
	</div>
</div>
