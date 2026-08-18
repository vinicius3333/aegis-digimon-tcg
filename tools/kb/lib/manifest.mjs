// Per-source provenance + crawl progress. Enables staleness checks and resumable
// crawls (the Q&A crawl records which cards have been fetched).

import fs from "node:fs";
import path from "node:path";
import { MANIFEST_PATH } from "./paths.mjs";

export function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export function updateManifest(source, entry) {
  const manifest = readManifest();
  manifest[source] = { ...manifest[source], ...entry, fetchedAt: new Date().toISOString() };
  writeManifest(manifest);
  return manifest;
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
