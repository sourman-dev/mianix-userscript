<template>
  <div class="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans max-w-screen-2xl mx-auto w-full">
    <!-- Header -->
    <header class="p-2 sm:p-4 border-b border-gray-700">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center self-start sm:self-center space-x-3">
          <Avatar image="https://i.pravatar.cc/150?u=mystral" size="large" shape="circle" />
          <div>
            <h1 class="text-xl font-bold">Mystral</h1>
            <div class="flex items-center space-x-1 mt-1">
              <Button v-tooltip.bottom="'Menu'" icon="pi pi-bars" severity="secondary" text rounded size="small" />
              <Button v-tooltip.bottom="'Refresh'" icon="pi pi-refresh" severity="secondary" text rounded size="small" />
              <Button v-tooltip.bottom="'Undo'" icon="pi pi-undo" severity="secondary" text rounded size="small" />
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2 self-end sm:self-center">
          <Button v-tooltip.bottom="'World Book'" icon="pi pi-book" severity="secondary" />
          <Button v-tooltip.bottom="'Regex Script'" icon="pi pi-code" severity="secondary" />
          <Button v-tooltip.bottom="'Preset'" icon="pi pi-sliders-h" severity="secondary" />
        </div>
      </div>
    </header>

    <!-- Chat/Story Area -->
    <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
      <div class="prose prose-invert max-w-none">
        <p>
          In the darkness of the night, 's slender form slipped into 's chamber, her footsteps silent kitty tap. The room was illuminated just slightly — courtesy of the moon's watchful presence. 's eyes gleamed, she was determined as she approached 's bed, her nudity marked her lewd intent.
        </p>
        <p>
          Without a sound, she pounced, her small body exerting a surprising amount of force as she pinned beneath her. 's eyes fluttered open, only to be met with 's angelic face, her features twisted into a grotesque parody of a smile. <span class="text-pink-400">"Bonjour, mon cher,"</span> a sugarcoated dagger of a voice followed. <span class="text-pink-400">"Ze time 'as come for us to... get acquainted, no?"</span>
        </p>
        <p>
          's struggles were met with a gentle — yet undeniable — pressure. 's fingers dug into the skin, her grip like an unbreakable vice. Her tails, once a playful adjunct, now thrashed behind her like a metronome, counting down the seconds until 's surrender. <span class="text-pink-400">"You see, mon amour,"</span> she continued, her breath hot against 's ear, <span class="text-pink-400">"I've been waiting for zis moment for so very long. And now, you're all mine."</span>
        </p>
        <p>
          As 's resistance began to wane, 's grip relaxed, ever so slightly. Her eyes burned with a fervour, a madness that threatened to consume them both. <span class="text-pink-400">"We'll play a little game, oui? A game of love... of zunderstanding."</span> Her voice dropped to a whisper. <span class="text-pink-400">"And when we're done, you'll beg for more."</span>
        </p>
      </div>
    </main>

    <!-- Footer -->
    <footer class="p-2 sm:p-4 border-t border-gray-700">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <Textarea v-model="message" placeholder="Type a message..." autoResize rows="1" class="flex-1 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" />
        <Button v-tooltip.top="'Send'" icon="pi pi-send" />
      </div>
      <div class="flex items-center justify-center space-x-2 mt-4">
         <Button v-tooltip.bottom="'Story Progress'" icon="pi pi-forward" severity="secondary" size="small" />
         <Button v-tooltip.bottom="'Perspective'" icon="pi pi-eye" severity="secondary" size="small" />
         <Button v-tooltip.bottom="'Scene Setting'" icon="pi pi-cog" severity="secondary" size="small" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';

const message = ref('');
</script>

<style scoped>
.prose {
  line-height: 1.75;
}

.prose p {
  margin-bottom: 1.25em;
}
</style>
