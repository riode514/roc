import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// Credentials live in the repo-root .env (shared with the scraper), while
// Astro would only look inside web/. On Netlify the same names arrive as real
// environment variables and nothing is read from disk.
for (const name of ['../.env', '.env']) {
  try {
    for (const line of readFileSync(new URL(name, import.meta.url), 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no .env here — expected in CI */ }
}

export default defineConfig({
  site: process.env.URL ?? 'https://roc-propietats.netlify.app',
  output: 'static',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
