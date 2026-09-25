import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildCardsBundle } from "./cards-bundle.mjs";

const cacheDirectory = fileURLToPath(new URL("../node_modules/.cache/", import.meta.url));

export default async function setup() {
  removeAbandonedCacheWrites();
  await buildCardsBundle();
}

// A worker killed between writing its cache temp file and renaming it leaves `<name>.<pid>` behind.
// Workers only start after this setup runs, so none of them can still be writing one.
function removeAbandonedCacheWrites() {
  let entries = [];
  try {
    entries = readdirSync(cacheDirectory);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (/^ts-loader\.v8\.\d+$/.test(entry)) rmSync(cacheDirectory + entry, { force: true });
  }
}
