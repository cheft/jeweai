<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { loadStripe } from '@stripe/stripe-js';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	// Replace with your public key
	const PUBLIC_KEY = 'pk_test_TYooMQauvdEDq54NiTphI7jx';
	let stripe: any = $state(null);
	let elements: any = $state(null);
	let paymentElement: any = $state(null);
	let clientSecret = $state('');

	let errorMessage = $state('');
	let isProcessing = $state(false);

	const plan = $page.url.searchParams.get('plan') || 'growth';
	const cycle = $page.url.searchParams.get('cycle') || 'monthly';

	const planDetails = {
		growth: { name: 'Growth Plan', price: cycle === 'monthly' ? 399 : 3299 },
		scale: { name: 'Scale Plan', price: cycle === 'monthly' ? 599 : 4299 }
	};
	const currentPlan = planDetails[plan as keyof typeof planDetails] || planDetails.growth;

	let useSavedCard = $state(false);
	let selectedCardId = $state('');

	onMount(async () => {
		// Verify Login
		if (!$auth) {
			goto('/pricing');
			return;
		}

		// Default to saved card if user has one
		if ($auth.paymentMethods?.length > 0) {
			useSavedCard = true;
			// Find default or first
			const def = $auth.paymentMethods.find((pm) => pm.isDefault);
			selectedCardId = def ? def.id : $auth.paymentMethods[0].id;
		}

		// Initialize Stripe
		stripe = await loadStripe(PUBLIC_KEY);

		// Fetch PaymentIntent
		const res = await fetch('/api/stripe/create-payment-intent', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: currentPlan.price * 100, // cents
				currency: 'usd',
				plan: plan
			})
		});

		const data = await res.json();
		clientSecret = data.clientSecret;

		if (clientSecret) {
			const appearance = {
				theme: 'night',
				variables: {
					colorPrimary: '#00e5ff',
					colorBackground: '#1e1e2e',
					colorText: '#ffffff',
					colorDanger: '#df1b41',
					fontFamily: 'Inter, system-ui, sans-serif',
					borderRadius: '8px'
				}
			};
			elements = stripe.elements({ appearance, clientSecret });

			const paymentElementOptions = {
				layout: 'tabs'
			};
			paymentElement = elements.create('payment', paymentElementOptions);
			paymentElement.mount('#payment-element');
		} else {
			errorMessage = 'Failed to load payment configuration.';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isProcessing = true;
		errorMessage = '';

		if (useSavedCard) {
			// Mock charging saved card
			// In real app: Call backend to confirm PI with payment_method_id
			await new Promise((r) => setTimeout(r, 1500)); // Sim delay

			// Always succeed for demo
			window.location.href =
				window.location.origin + '/billing?status=success&plan=' + plan + '&cycle=' + cycle;
			return;
		}

		if (!stripe || !elements) return;

		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				// Make sure to change this to your payment completion page
				return_url:
					window.location.origin + '/billing?status=success&plan=' + plan + '&cycle=' + cycle
			}
		});

		// This point will only be reached if there is an immediate error when
		// confirming the payment. Otherwise, your customer will be redirected to
		// your `return_url`.
		if (error.type === 'card_error' || error.type === 'validation_error') {
			errorMessage = error.message;
		} else {
			errorMessage = 'An unexpected error occurred.';
		}

		isProcessing = false;
	}
</script>

<div class="min-h-screen pt-24 pb-12">
	<div class="container mx-auto px-4">
		<div class="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
			<!-- Order Summary -->
			<div class="order-2 lg:order-1">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
					<h2 class="mb-6 text-2xl font-bold text-white">Order Summary</h2>

					<div class="mb-6 flex items-center justify-between border-b border-white/10 pb-6">
						<div>
							<h3 class="text-lg font-semibold text-white">{currentPlan.name}</h3>
							<p class="text-sm text-gray-400">Billed {cycle}</p>
						</div>
						<div class="text-xl font-bold text-white">${currentPlan.price}</div>
					</div>

					<div class="mb-6 flex justify-between text-gray-300">
						<span>Subtotal</span>
						<span>${currentPlan.price}</span>
					</div>

					<div class="flex items-center justify-between pt-4">
						<span class="text-lg font-bold text-white">Total</span>
						<span class="text-2xl font-bold text-seko-accent">${currentPlan.price}</span>
					</div>

					<div class="mt-8 rounded-lg bg-seko-accent/10 p-4 text-sm text-gray-300">
						<p>
							You are subscribing to the <strong>{plan}</strong> tier. You will receive
							<strong>{plan === 'scale' ? 1200 : 600} Credits</strong> immediately.
						</p>
					</div>
				</div>
			</div>

			<!-- Payment Form -->
			<div class="order-1 lg:order-2">
				<h1 class="mb-6 text-3xl font-bold text-white">Secure Checkout</h1>

				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
					{#if $auth?.paymentMethods?.length > 0}
						<div class="mb-6 flex gap-4 border-b border-white/10 pb-4">
							<button
								class="pb-2 text-sm font-bold transition-colors {useSavedCard
									? 'border-b-2 border-seko-accent text-white'
									: 'text-gray-400 hover:text-white'}"
								onclick={() => (useSavedCard = true)}
							>
								Saved Cards
							</button>
							<button
								class="pb-2 text-sm font-bold transition-colors {!useSavedCard
									? 'border-b-2 border-seko-accent text-white'
									: 'text-gray-400 hover:text-white'}"
								onclick={() => (useSavedCard = false)}
							>
								New Card
							</button>
						</div>
					{/if}

					<form id="payment-form" onsubmit={handleSubmit}>
						{#if useSavedCard && $auth?.paymentMethods?.length > 0}
							<!-- Saved Cards List -->
							<div class="mb-6 space-y-3">
								{#each $auth.paymentMethods as pm}
									<label
										class="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4 transition-colors hover:border-seko-accent has-checked:border-seko-accent has-checked:bg-seko-accent/10"
									>
										<div class="flex items-center gap-3">
											<input
												type="radio"
												name="savedCard"
												value={pm.id}
												checked={selectedCardId === pm.id}
												onchange={() => (selectedCardId = pm.id)}
												class="text-seko-accent focus:ring-seko-accent"
											/>
											<span class="font-bold text-white uppercase">{pm.brand}</span>
											<span class="text-sm text-gray-300">•••• {pm.last4}</span>
										</div>
										<span class="text-xs text-gray-500">Exp {pm.expMonth}/{pm.expYear}</span>
									</label>
								{/each}
							</div>
						{:else}
							<!-- Stripe Element -->
							{#if !clientSecret && !errorMessage}
								<div class="flex h-64 items-center justify-center text-gray-400">
									<div
										class="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-seko-accent"
									></div>
								</div>
							{/if}

							<div id="payment-element" class="mb-6">
								<!-- Stripe Element will be inserted here -->
							</div>
						{/if}

						{#if errorMessage}
							<div class="mb-6 rounded-lg bg-red-500/20 p-4 text-sm text-red-200" role="alert">
								{errorMessage}
							</div>
						{/if}

						<button
							class="w-full rounded-lg bg-seko-accent py-3 text-sm font-bold text-black transition-transform hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isProcessing || (!useSavedCard && (!clientSecret || !stripe))}
						>
							{isProcessing ? 'Processing...' : `Pay $${currentPlan.price}`}
						</button>

						<div class="mt-4 flex justify-center gap-2 text-xs text-gray-500">
							<span>Powered by <strong>Stripe</strong></span>
							<span>•</span>
							<span>SSL Secure Payment</span>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
