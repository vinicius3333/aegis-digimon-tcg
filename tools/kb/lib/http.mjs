// Throttled, cached HTTP for polite scraping. Native fetch (Node >= 20), no deps.
//
// fetchText caches every response to disk (RAW_DIR) so re-runs and re-parses cost
// no network. Pass force: true to bypass the cache. A global throttle keeps at
// least THROTTLE_MS between live requests; cache hits are not throttled.

import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { USER_AGENT } from "./paths.mjs";

const THROTTLE_MS = Number(process.env.AEGIS_KB_THROTTLE_MS ?? 1100);
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

let lastRequestAt = 0;

async function throttle(ms) {
  const wait = lastRequestAt + ms - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function isRetryable(status) {
  return status === 429 || status === 408 || (status >= 500 && status <= 599);
}

async function fetchOnce(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
  return res;
}

export async function fetchText(url, { cacheFile, force = false, throttleMs = THROTTLE_MS } = {}) {
  if (cacheFile && !force && fs.existsSync(cacheFile)) {
    return { text: fs.readFileSync(cacheFile, "utf8"), cached: true };
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await throttle(throttleMs);
    try {
      const res = await fetchOnce(url);
      if (!res.ok) {
        if (isRetryable(res.status) && attempt < MAX_RETRIES) {
          await sleep(throttleMs * attempt * 2);
          continue;
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      const text = await res.text();
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, text);
      }
      return { text, cached: false };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(throttleMs * attempt * 2);
    }
  }
  throw lastError;
}

export async function fetchBinary(url, { cacheFile, force = false, throttleMs = THROTTLE_MS } = {}) {
  if (cacheFile && !force && fs.existsSync(cacheFile)) {
    return { buffer: fs.readFileSync(cacheFile), cached: true };
  }
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await throttle(throttleMs);
    try {
      const res = await fetchOnce(url);
      if (!res.ok) {
        if (isRetryable(res.status) && attempt < MAX_RETRIES) {
          await sleep(throttleMs * attempt * 2);
          continue;
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, buffer);
      }
      return { buffer, cached: false };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(throttleMs * attempt * 2);
    }
  }
  throw lastError;
}
