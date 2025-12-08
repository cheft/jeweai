<script lang="ts">
  import { Globe, User } from 'lucide-svelte';
  import LoginModal from './LoginModal.svelte';

  let isLoginOpen = $state(false);
</script>

<header class="fixed top-0 left-0 w-full z-50 bg-seko-bg/80 backdrop-blur-md border-b border-white/5">
  <div class="container mx-auto px-4 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href="/" class="text-2xl font-bold tracking-tighter flex items-center gap-2">
			<div class="w-8 h-8 bg-seko-accent rounded-lg rotate-3"></div>
			JewelAI
		</a>

    <!-- Navigation -->
    <nav class="hidden md:flex items-center gap-8">
      <a href="/gallery" class="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >Gallery</a
      >
      <a href="#" class="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >Pricing</a
      >
      <a href="#" class="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >About</a
      >
    </nav>

    <!-- Auth Buttons -->
    <div class="flex items-center gap-4">
      <button
        class="text-sm font-medium text-white hover:text-seko-accent transition-colors"
        onclick={() => (isLoginOpen = true)}
      >
        Log In
      </button>
      <button
        class="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
        onclick={() => (isLoginOpen = true)}
      >
        Get Started
      </button>
    </div>
  </div>
</header>

<LoginModal isOpen={isLoginOpen} onClose={() => (isLoginOpen = false)} />
