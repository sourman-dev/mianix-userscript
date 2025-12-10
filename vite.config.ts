// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey, { cdn } from 'vite-plugin-monkey';
import tailwindcss from '@tailwindcss/vite';
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';

import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    Components({
      resolvers: [
        PrimeVueResolver(),
      ],
    }),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Mianix RoleplayAI',
        version: '0.1.5', // Tăng phiên bản để Tampermonkey cập nhật
        icon: 'https://mianix.sourman.dev/logo.png',
        namespace: 'sourman.dev/mianix',
        match: ['https://mianix.sourman.dev/roleplay'],

        grant: [
          'GM.getValue',
          'GM.setValue',
          'GM.xmlHttpRequest',
          'GM.addValueChangeListener'
        ],
      },
      build: {
        externalGlobals: {
          vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js'),
          'primevue': cdn.jsdelivr('primevue', 'dist/primevue.min.js'),
          // '@primeuix/themes/aura': cdn.jsdelivr('@primeuix/themes', '@1.1.2/+esm'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // lib: {
    //   entry: 'src/main.ts',
    //   name: SCRIPT_NAME,
    //   formats: ['iife'],
    // },
    // rollupOptions: {
    //   external: ['vue', '@electric-sql/pglite'],
    //   output: {
    //     globals: {
    //       vue: 'Vue',
    //       // '@electric-sql/pglite': 'PGlite',
    //     },
    //     inlineDynamicImports: true,
    //     extend: true,
    //   },
    // },
    minify: 'terser',
  },

});