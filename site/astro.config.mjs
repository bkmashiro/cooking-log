import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
export default defineConfig({
  site: 'https://wok.yuzhes.com',
  output: 'static',
  build: { format: 'directory' },
  integrations: [svelte()],
});
