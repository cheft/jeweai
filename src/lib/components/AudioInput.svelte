<script lang="ts">
  import { Mic, Upload, Play, Square } from 'lucide-svelte';

  let isRecording = $state(false);
  let audioFile: File | null = $state(null);

  function toggleRecording() {
    isRecording = !isRecording;
  }

  function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      audioFile = target.files[0];
    }
  }
</script>

<section class="py-20">
  <div class="container mx-auto px-4 max-w-3xl">
    <div class="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold mb-2">Provide Your Voice</h2>
        <p class="text-gray-400 text-sm">Upload an audio file or record directly to animate your character</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Record Option -->
        <div class="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-seko-accent/50 hover:bg-white/5 transition-all group">
          <button 
            class="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300"
            class:bg-red-500={isRecording}
            class:animate-pulse={isRecording}
            class:bg-seko-accent={!isRecording}
            onclick={toggleRecording}
          >
            {#if isRecording}
              <Square class="text-white" fill="currentColor" />
            {:else}
              <Mic class="text-seko-bg" />
            {/if}
          </button>
          <span class="font-medium text-white mb-1">
            {isRecording ? 'Recording...' : 'Record Voice'}
          </span>
          <span class="text-xs text-gray-500">Click to start/stop</span>
        </div>

        <!-- Upload Option -->
        <label class="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-seko-purple/50 hover:bg-white/5 transition-all cursor-pointer group">
          <input type="file" accept="audio/*" class="hidden" onchange={handleFileUpload} />
          <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload class="text-white" />
          </div>
          <span class="font-medium text-white mb-1">
            {audioFile ? audioFile.name : 'Upload Audio'}
          </span>
          <span class="text-xs text-gray-500">MP3, WAV, or M4A</span>
        </label>
      </div>

      {#if audioFile || isRecording}
        <div class="mt-8 pt-6 border-t border-white/10 flex justify-center">
          <button class="w-full md:w-auto px-8 py-3 bg-seko-purple text-white font-bold rounded-xl hover:bg-seko-purple/90 transition-colors flex items-center justify-center gap-2">
            <Play size={18} fill="currentColor" />
            Generate Animation
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>
