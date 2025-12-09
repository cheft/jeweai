<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import {
		formatCardNumber,
		formatExpiry,
		getCardType,
		luhnCheck,
		validateExpiry,
		type CardType
	} from '$lib/utils/validation';

	let { onAdd, onCancel } = $props<{
		onAdd: (details: any) => void;
		onCancel: () => void;
	}>();

	let cardNumber = $state('');
	let expiry = $state('');
	let cvc = $state('');
	let cardName = $state('');

	let cardType = $derived(getCardType(cardNumber) as CardType);
	let isValidNumber = $derived(
		cardNumber.replace(/\s/g, '').length >= 13 && luhnCheck(cardNumber.replace(/\s/g, ''))
	);
	let isValidExpiry = $derived(() => {
		if (expiry.length !== 5) return false;
		const [m, y] = expiry.split('/');
		return validateExpiry(m, y);
	});
	let isValidCvc = $derived(cvc.length >= 3);

	// Derived Validation Status
	// We invoke the function for isValidExpiry here since it was defined as a closure in my thought process,
	// but better to make it reactive statement directly.
	// Let's correct logic below in input handling or just use simple derivation.

	function checkExpiry() {
		if (expiry.length !== 5) return false;
		const [m, y] = expiry.split('/');
		return validateExpiry(m, y);
	}

	function handleNumberInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const formatted = formatCardNumber(input.value);
		cardNumber = formatted;
	}

	function handleExpiryInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// prevent deletion block
		if ((e as InputEvent).inputType === 'deleteContentBackward') {
			expiry = input.value;
			return;
		}
		const formatted = formatExpiry(input.value);
		expiry = formatted;
	}

	function handleSubmit() {
		if (isValidNumber && checkExpiry() && isValidCvc) {
			const [expMonth, expYear] = expiry.split('/').map((x) => parseInt(x, 10)); // 2 digits
			// Convert 2 digit year to 4? 20xx
			const fullYear = 2000 + expYear;

			onAdd({
				brand: cardType === 'unknown' ? 'card' : cardType,
				last4: cardNumber.slice(-4),
				expMonth,
				expYear: fullYear
			});
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
	transition:fade={{ duration: 200 }}
>
	<div
		class="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e2e] p-6 shadow-2xl"
		transition:scale={{ duration: 250, start: 0.95 }}
	>
		<!-- Background Glow based on card type -->
		<div
			class="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full blur-[100px] transition-colors duration-500
			{cardType === 'visa'
				? 'bg-blue-600/20'
				: cardType === 'mastercard'
					? 'bg-orange-600/20'
					: cardType === 'amex'
						? 'bg-cyan-600/20'
						: 'bg-seko-accent/10'}"
		></div>

		<h3 class="relative z-10 mb-6 text-xl font-bold text-white">Add New Card</h3>

		<div class="relative z-10 space-y-5">
			<!-- Card Preview (Simple visual cue) -->
			<div class="mb-2 flex items-center gap-2 text-sm text-gray-400">
				<span>Accepted:</span>
				<div class="flex gap-2 opacity-50">
					<span class={cardType === 'visa' ? 'font-bold text-white opacity-100' : ''}>Visa</span>
					<span class={cardType === 'mastercard' ? 'font-bold text-white opacity-100' : ''}
						>Mastercard</span
					>
					<span class={cardType === 'amex' ? 'font-bold text-white opacity-100' : ''}>Amex</span>
				</div>
			</div>

			<div>
				<label for="card-number" class="mb-1 block text-sm font-medium text-gray-300"
					>Card Number</label
				>
				<div class="relative">
					<input
						id="card-number"
						type="text"
						value={cardNumber}
						oninput={handleNumberInput}
						placeholder="0000 0000 0000 0000"
						maxlength="19"
						class="w-full rounded-lg border bg-black/40 p-3 pl-12 text-white transition-colors outline-none
							{cardNumber.length > 0 && !isValidNumber && cardNumber.length >= 19
							? 'border-red-500/50 focus:border-red-500'
							: 'border-white/10 focus:border-seko-accent'}"
					/>
					<!-- Icon slot -->
					<div class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
						{#if cardType === 'visa'}
							<span class="text-xs font-bold text-blue-400">VISA</span>
						{:else if cardType === 'mastercard'}
							<span class="text-xs font-bold text-orange-400">MC</span>
						{:else if cardType === 'amex'}
							<span class="text-xs font-bold text-cyan-400">AMEX</span>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><rect width="20" height="14" x="2" y="5" rx="2" /><line
									x1="2"
									x2="22"
									y1="10"
									y2="10"
								/></svg
							>
						{/if}
					</div>
					{#if cardNumber.length > 0 && isValidNumber}
						<div class="absolute top-1/2 right-3 -translate-y-1/2 text-green-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
							>
						</div>
					{/if}
				</div>
			</div>

			<div>
				<label for="card-name" class="mb-1 block text-sm font-medium text-gray-300"
					>Cardholder Name</label
				>
				<input
					id="card-name"
					type="text"
					bind:value={cardName}
					placeholder="John Doe"
					class="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-seko-accent"
				/>
			</div>

			<div class="flex gap-4">
				<div class="flex-1">
					<label for="card-expiry" class="mb-1 block text-sm font-medium text-gray-300"
						>Expiry</label
					>
					<input
						id="card-expiry"
						type="text"
						value={expiry}
						oninput={handleExpiryInput}
						placeholder="MM/YY"
						maxlength="5"
						class="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-center text-white outline-none focus:border-seko-accent
                        {expiry.length === 5 && !checkExpiry()
							? 'border-red-500/50 text-red-400'
							: ''}"
					/>
				</div>
				<div class="flex-1">
					<label for="card-cvc" class="mb-1 block text-sm font-medium text-gray-300">CVC</label>
					<input
						id="card-cvc"
						type="text"
						bind:value={cvc}
						placeholder="123"
						maxlength="4"
						class="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-center text-white outline-none focus:border-seko-accent"
					/>
				</div>
			</div>
		</div>

		<div class="mt-8 flex justify-end gap-3">
			<button
				class="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
				onclick={onCancel}
			>
				Cancel
			</button>
			<button
				class="rounded-lg bg-seko-accent px-6 py-2 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
				disabled={!isValidNumber || !checkExpiry() || !isValidCvc || cardName.length < 2}
				onclick={handleSubmit}
			>
				Add Card
			</button>
		</div>
	</div>
</div>
