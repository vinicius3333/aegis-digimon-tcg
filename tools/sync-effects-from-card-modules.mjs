import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CARDS_PATH = join(ROOT, "packages/shared/src/cards/data/cards.json");
const EFFECTS_PATH = join(ROOT, "packages/shared/src/effects/effects.json");
const API_CARDS_SOURCE = join(ROOT, "apps/api/src/cards");
const API_CARDS_DIST = join(ROOT, "apps/api/dist/cards");
const BUILD_TIMEOUT_MS = 120_000;
const FORMAT_TIMEOUT_MS = 30_000;
const GIT_TIMEOUT_MS = 30_000;
const MAX_CATALOG_BYTES = 32 * 1024 * 1024;

function usage() {
  return [
    "Usage: pnpm effects:sync:set -- --set <SET>",
    "       pnpm effects:check:set -- --set <SET>",
    "       pnpm effects:check:set -- --set <SET> --base <GIT-REF>",
    "",
    "Synchronizes only the requested set's effects.json records from the",
    "authoritative compiled exports in apps/api/src/cards/<SET>.",
  ].join("\n");
}

export function parseArguments(args) {
  let set;
  let base;
  let check = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") continue;
    if (argument === "--check") {
      check = true;
      continue;
    }
    if (argument === "--set") {
      set = args[index + 1];
      index += 1;
      continue;
    }
    if (argument?.startsWith("--set=")) {
      set = argument.slice("--set=".length);
      continue;
    }
    if (argument === "--base") {
      base = args[index + 1];
      index += 1;
      continue;
    }
    if (argument?.startsWith("--base=")) {
      base = argument.slice("--base=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
  }

  const normalizedSet = set?.toUpperCase();
  if (!normalizedSet || !/^[A-Z0-9]+$/.test(normalizedSet)) {
    throw new Error(`A safe set code is required.\n\n${usage()}`);
  }
  if (base !== undefined && !/^[A-Za-z0-9._/-]+$/.test(base)) {
    throw new Error(`A safe Git base ref is required.\n\n${usage()}`);
  }

  return { ...(base === undefined ? {} : { base }), check, set: normalizedSet };
}

function scanJsonValueEnd(document, start) {
  const opener = document[start];
  if (opener !== "{" && opener !== "[") {
    throw new Error(`Expected a JSON object or array at byte ${start}.`);
  }

  const stack = [opener];
  let inString = false;
  let escaped = false;

  for (let index = start + 1; index < document.length; index += 1) {
    const character = document[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      stack.push(character);
      continue;
    }
    if (character !== "}" && character !== "]") continue;

    const expected = character === "}" ? "{" : "[";
    if (stack.pop() !== expected) {
      throw new Error(`Unbalanced JSON delimiters at byte ${index}.`);
    }
    if (stack.length === 0) return index + 1;
  }

  throw new Error(`Unterminated JSON value at byte ${start}.`);
}

export function topLevelEntryRanges(document) {
  JSON.parse(document);
  const ranges = new Map();
  let cursor = 0;
  while (/\s/.test(document[cursor] ?? "")) cursor += 1;
  if (document[cursor] !== "{") throw new Error("effects.json must contain a top-level object.");
  cursor += 1;

  while (cursor < document.length) {
    while (/\s/.test(document[cursor] ?? "")) cursor += 1;
    if (document[cursor] === "}") break;
    if (document[cursor] !== '"') throw new Error(`Expected a property name at byte ${cursor}.`);

    const keyStart = cursor;
    cursor += 1;
    let escaped = false;
    while (cursor < document.length) {
      const character = document[cursor];
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') break;
      cursor += 1;
    }
    if (document[cursor] !== '"') throw new Error(`Unterminated property name at byte ${keyStart}.`);
    cursor += 1;
    const key = JSON.parse(document.slice(keyStart, cursor));
    while (/\s/.test(document[cursor] ?? "")) cursor += 1;
    if (document[cursor] !== ":") throw new Error(`Expected ':' after ${key}.`);
    cursor += 1;
    while (/\s/.test(document[cursor] ?? "")) cursor += 1;
    const start = cursor;
    const end = scanJsonValueEnd(document, start);
    ranges.set(key, { end, start, value: document.slice(start, end) });
    cursor = end;
    while (/\s/.test(document[cursor] ?? "")) cursor += 1;
    if (document[cursor] === ",") {
      cursor += 1;
      continue;
    }
    if (document[cursor] !== "}") throw new Error(`Expected ',' or '}' after ${key}.`);
    break;
  }

  return ranges;
}

export function replaceTopLevelEntries(document, replacements) {
  const originalRanges = topLevelEntryRanges(document);
  const edits = [];

  for (const [key, value] of replacements) {
    const range = originalRanges.get(key);
    if (!range) throw new Error(`${key} is missing from effects.json.`);
    edits.push({ ...range, key, value });
  }

  edits.sort((left, right) => right.start - left.start);
  let updated = document;
  for (const edit of edits) {
    updated = `${updated.slice(0, edit.start)}${edit.value}${updated.slice(edit.end)}`;
  }

  JSON.parse(updated);
  const updatedRanges = topLevelEntryRanges(updated);
  for (const [key, range] of originalRanges) {
    if (replacements.has(key)) continue;
    if (updatedRanges.get(key)?.value !== range.value) {
      throw new Error(`Refusing to change out-of-scope record ${key}.`);
    }
  }

  return updated;
}

export function semanticScopeDiff(baseDocument, currentDocument, set) {
  const base = JSON.parse(baseDocument);
  const current = JSON.parse(currentDocument);
  const keys = [...new Set([...Object.keys(base), ...Object.keys(current)])].sort();
  const changed = keys.filter((key) => JSON.stringify(base[key]) !== JSON.stringify(current[key]));
  return {
    inSet: changed.filter((key) => key.startsWith(`${set}-`)),
    outsideSet: changed.filter((key) => !key.startsWith(`${set}-`)),
  };
}

function verifyScopeAgainstBase(document, set, base) {
  const effectsGitPath = relative(ROOT, EFFECTS_PATH).replaceAll("\\", "/");
  const result = spawnSync("git", ["show", `${base}:${effectsGitPath}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: MAX_CATALOG_BYTES,
    timeout: GIT_TIMEOUT_MS,
  });
  if (result.error?.code === "ETIMEDOUT") throw new Error(`git show exceeded ${GIT_TIMEOUT_MS}ms.`);
  if (result.status !== 0)
    throw new Error(`Unable to read effects.json at ${base}:\n${result.stderr || result.stdout}`);

  const scope = semanticScopeDiff(result.stdout, document, set);
  if (scope.outsideSet.length > 0) {
    throw new Error(`Found semantic changes outside ${set}: ${scope.outsideSet.join(", ")}`);
  }
  console.log(`${set}: ${scope.inSet.length} semantic changes against ${base}; zero outside the set.`);
}

function writeAtomically(path, contents) {
  const temporaryPath = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  try {
    writeFileSync(temporaryPath, contents, { flag: "wx" });
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

function formatRecords(records) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "oxfmt", "--stdin-filepath=effects.json", "--threads=1"],
    { cwd: ROOT, encoding: "utf8", input: `${JSON.stringify(records)}\n`, timeout: FORMAT_TIMEOUT_MS },
  );

  if (result.error?.code === "ETIMEDOUT") throw new Error(`oxfmt exceeded ${FORMAT_TIMEOUT_MS}ms.`);
  if (result.status !== 0) {
    throw new Error(`oxfmt failed:\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

function buildRuntime() {
  for (const packageName of ["@aegis/shared", "@aegis/api"]) {
    const result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["--filter", packageName, "build"], {
      cwd: ROOT,
      stdio: "inherit",
      timeout: BUILD_TIMEOUT_MS,
    });
    if (result.error?.code === "ETIMEDOUT") throw new Error(`${packageName} build exceeded ${BUILD_TIMEOUT_MS}ms.`);
    if (result.status !== 0) throw new Error(`${packageName} build failed.`);
  }
}

export function catalogIdsForSet(set) {
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
  return [...new Set(cards.map((card) => card.cardId).filter((id) => id?.startsWith(`${set}-`)))].sort();
}

async function compiledRecordsForSet(set, cardIds) {
  const records = {};

  for (const cardId of cardIds) {
    const sourcePath = join(API_CARDS_SOURCE, set, `${cardId}.ts`);
    const distPath = join(API_CARDS_DIST, set, `${cardId}.js`);
    if (!existsSync(sourcePath)) throw new Error(`Missing authoritative module ${relative(ROOT, sourcePath)}.`);
    if (!existsSync(distPath)) throw new Error(`Build did not emit ${relative(ROOT, distPath)}.`);

    const module = await import(`${pathToFileURL(distPath).href}?sync=${Date.now()}`);
    if (!module.compiled || typeof module.compiled !== "object") {
      throw new Error(`${relative(ROOT, sourcePath)} does not export compiled IR.`);
    }
    records[cardId] = module.compiled;
  }

  return records;
}

async function main() {
  const { base, check, set } = parseArguments(process.argv.slice(2));
  const cardIds = catalogIdsForSet(set);
  if (cardIds.length === 0) throw new Error(`No catalog cards found for ${set}.`);

  buildRuntime();
  const records = await compiledRecordsForSet(set, cardIds);
  const formattedRanges = topLevelEntryRanges(formatRecords(records));
  const replacements = new Map(
    cardIds.map((cardId) => {
      const value = formattedRanges.get(cardId)?.value;
      if (!value) throw new Error(`Formatter dropped ${cardId}.`);
      return [cardId, value];
    }),
  );

  const original = readFileSync(EFFECTS_PATH, "utf8");
  const updated = replaceTopLevelEntries(original, replacements);
  const changed = updated !== original;

  if (check && changed) {
    throw new Error(`${set} effects.json records are stale. Run: pnpm effects:sync:set -- --set ${set}`);
  }
  if (base !== undefined) verifyScopeAgainstBase(updated, set, base);
  if (!check && changed) writeAtomically(EFFECTS_PATH, updated);

  console.log(
    `${set}: ${cardIds.length} records ${changed ? (check ? "stale" : "synchronized") : "already synchronized"}.`,
  );
}

const invokedPath = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
