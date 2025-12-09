<script lang="ts">
	let {
		title,
		price,
		period = 'month',
		credits,
		features = [],
		highlight = false,
		buttonText = 'Subscribe',
		onSubscribe
	} = $props<{
		title: string;
		price: string | number;
		period?: string;
		credits: string | number;
		features?: string[];
		highlight?: boolean;
		buttonText?: string;
		onSubscribe?: () => void;
	}>();
</script>

<div
	class="relative flex flex-col rounded-2xl border p-8 transition-all hover:scale-105
    {highlight
		? 'border-seko-accent bg-seko-accent/10 shadow-[0_0_30px_rgba(var(--color-seko-accent),0.2)]'
		: 'border-white/10 bg-white/5 hover:border-white/20'}"
>
	{#if highlight}
		<div
			class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-seko-accent px-3 py-1 text-xs font-bold text-black"
		>
			Most Popular
		</div>
	{/if}

	<div class="mb-4">
		<h3 class="text-xl font-bold text-white">{title}</h3>
		<div class="mt-4 flex items-baseline gap-1">
			<span class="text-4xl font-bold text-white">${price}</span>
			{#if price !== 0 && price !== '0'}
				<span class="text-sm text-gray-400">/{period}</span>
			{/if}
		</div>
		<p class="mt-2 text-sm font-medium text-seko-accent">
			{credits} Credits
			{#if price !== 0 && price !== '0'}
				<span class="font-normal text-gray-400"> / {period}</span>
			{/if}
		</p>
	</div>

	<ul class="mb-8 flex-1 space-y-3">
		{#each features as feature}
			<li class="flex items-start gap-2 text-sm text-gray-300">
				<svg
					class="mt-0.5 h-4 w-4 shrink-0 text-seko-accent"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
						clip-rule="evenodd"
					/>
				</svg>
				{feature}
			</li>
		{/each}
	</ul>

	<button
		class="w-full rounded-lg px-4 py-3 text-sm font-bold transition-transform active:scale-95
        {highlight
			? 'bg-seko-accent text-black hover:bg-white hover:text-black'
			: 'bg-white/10 text-white hover:bg-white/20'}"
		onclick={onSubscribe}
	>
		{buttonText}
	</button>
</div>
