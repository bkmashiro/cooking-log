import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://wok.yuzhes.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
