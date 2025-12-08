<script lang="ts">
  import { Check } from 'lucide-svelte';
  import { clsx } from 'clsx';

  // Placeholder data for characters
  const characters = [
    { id: 1, name: 'Cyber Ninja', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { id: 2, name: 'Space Explorer', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { id: 3, name: 'Mystic Mage', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Willow' },
    { id: 4, name: 'Tech Guru', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scooby' },
    { id: 5, name: 'Urban Legend', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
    { id: 6, name: 'Forest Spirit', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Precious' },
  ];

  let selectedId = $state(1);
</script>

<section class="py-20 bg-black/50">
  <div class="container mx-auto px-4">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold mb-4">Choose Your Character</h2>
      <p class="text-gray-400">Select a persona to start your conversation</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {#each characters as char}
        <button
          class={clsx(
            "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 focus:outline-none",
            selectedId === char.id ? "border-seko-accent" : "border-white/10"
          )}
          onclick={() => selectedId = char.id}
        >
          <img 
            src={char.image} 
            alt={char.name}
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span class="text-white font-medium text-sm">{char.name}</span>
          </div>

          {#if selectedId === char.id}
            <div class="absolute top-2 right-2 bg-seko-accent text-seko-bg p-1 rounded-full shadow-lg">
              <Check size={14} strokeWidth={3} />
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</section>
