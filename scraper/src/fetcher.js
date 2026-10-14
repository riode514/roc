// Polite HTTP client for rocpropietats.com.
//
// robots.txt asks for `Crawl-delay: 33`. The scheduled crawl honours that by
// default; ROC_CRAWL_DELAY_MS can lower it for local development. Requests are
// serialised through a single promise chain so the delay holds no matter how
// the caller drives it.

import { BASE, USER_AGENT } from './site.js';

const DEFAULT_DELAY_MS = 33_000;
const MAX_ATTEMPTS = 4;

export class Fetcher {
  constructor({ delayMs, logger = console } = {}) {
    this.delayMs = Number(delayMs ?? process.env.ROC_CRAWL_DELAY_MS ?? DEFAULT_DELAY_MS);
    this.logger = logger;
    this.queue = Promise.resolve();
    this.lastRequestAt = 0;
    this.requestCount = 0;
  }

  headers(extra = {}) {
    return {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      ...extra,
    };
  }

  /** Serialises every request and enforces the crawl delay between them. */
  schedule(task) {
    const run = this.queue.then(async () => {
      const waited = Date.now() - this.lastRequestAt;
      if (this.lastRequestAt && waited < this.delayMs) {
        await sleep(this.delayMs - waited);
      }
      try {
        return await task();
      } finally {
        this.lastRequestAt = Date.now();
        this.requestCount += 1;
      }
    });
    // Keep the chain alive even when a task rejects.
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  get(path) {
    return this.schedule(() => this.request(path, null));
  }

  /** POST the listing form — this is how GiraWeb pages and sorts results. */
  postForm(path, fields) {
    const body = new URLSearchParams(fields).toString();
    return this.schedule(() =>
      this.request(path, body, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': BASE,
        'Referer': BASE + path,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
      }),
    );
  }

  async request(path, body, extraHeaders = {}) {
    const url = path.startsWith('http') ? path : BASE + path;
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: body == null ? 'GET' : 'POST',
          headers: this.headers(extraHeaders),
          body: body ?? undefined,
          redirect: 'follow',
          signal: AbortSignal.timeout(45_000),
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          // 4xx other than 429 will not improve on retry.
          const err = new Error(`HTTP ${res.status} for ${url}`);
          err.permanent = true;
          throw err;
        }
        return await res.text();
      } catch (err) {
        lastError = err;
        if (err.permanent || attempt === MAX_ATTEMPTS) break;
        const backoff = Math.min(60_000, 2 ** attempt * 2_000);
        this.logger.warn(`  retry ${attempt}/${MAX_ATTEMPTS - 1} for ${url}: ${err.message} (waiting ${backoff}ms)`);
        await sleep(backoff);
      }
    }
    throw lastError;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
