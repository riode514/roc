import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://roc-propietats.netlify.app',
  output: 'static',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
