import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const directory = "test-support/batches";
const batchSize = 120;

/**
 * Group independent card suites so Vitest pays its per-file collection and IPC
 * cost once per group. The config keeps suites with hooks or runner state as
 * individual files; the imports still register every original test by name.
 */
export function writeCardTestBatches(files) {
  const bySet = new Map();
  for (const file of files) {
    const set = file.split("/")[2];
    if (!set || !/^[\w-]+$/.test(set)) continue;
    const group = bySet.get(set) ?? [];
    group.push(file);
    bySet.set(set, group);
  }
  mkdirSync(directory, { recursive: true });
  const current = new Set();
  const batchedFiles = [];
  for (const [set, group] of bySet) {
    group.sort();
    for (let offset = 0; offset < group.length; offset += batchSize) {
      const chunk = group.slice(offset, offset + batchSize);
      const path = `${directory}/${set}-${Math.floor(offset / batchSize)}.test.ts`;
      const source = chunk.map((file) => `import ${JSON.stringify(`../../${file}`)};`).join("\n") + "\n";
      try {
        if (readFileSync(path, "utf8") !== source) writeFileSync(path, source);
      } catch {
        writeFileSync(path, source);
      }
      current.add(path);
      batchedFiles.push(...chunk);
    }
  }
  for (const stale of globSync(`${directory}/*.test.ts`)) {
    if (!current.has(stale)) rmSync(stale);
  }
  return batchedFiles;
}
