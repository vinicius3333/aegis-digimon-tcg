import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root = resolve(import.meta.dirname, "../..");
const manifests = ["package.json", "apps/api/package.json", "apps/web/package.json", "packages/shared/package.json"];
const pattern = /^(\d+)\.(\d+)\.(\d+)-beta$/;

export function displayVersion(version) {
  if (!pattern.test(version)) throw new Error(`Invalid beta version: ${version}`);
  return `v${version.replace(/-beta$/, "-BETA")}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function validate() {
  const versions = manifests.map((path) => [path, readJson(path).version]);
  const version = versions[0][1];
  if (!pattern.test(version)) throw new Error(`Root version must match X.Y.Z-beta: ${version}`);
  for (const [path, candidate] of versions)
    if (candidate !== version) throw new Error(`${path} has ${candidate}, expected ${version}`);
  const releases = readJson("apps/web/src/releases/releases.json");
  if (!Array.isArray(releases) || releases.length === 0) throw new Error("Release catalog is empty");
  if (releases[0].version !== version) throw new Error("Newest release must match package version");
  const seen = new Set();
  for (const release of releases) {
    if (!pattern.test(release.version) || seen.has(release.version))
      throw new Error(`Invalid or duplicate release: ${release.version}`);
    seen.add(release.version);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt)) throw new Error(`Invalid release date: ${release.releasedAt}`);
    if (!release.summary?.en || !release.summary?.["pt-BR"])
      throw new Error(`Missing localized summary: ${release.version}`);
    for (const item of [...release.features, ...release.fixes]) {
      if (!item.text?.en || !item.text?.["pt-BR"])
        throw new Error(`Missing localized release item: ${release.version}`);
      if (item.issue !== undefined && (!Number.isInteger(item.issue) || item.issue <= 0))
        throw new Error("Invalid issue number");
    }
  }
  return version;
}

function compare(left, right) {
  const a = left.match(pattern).slice(1).map(Number);
  const b = right.match(pattern).slice(1).map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function setVersion(next) {
  if (!pattern.test(next)) throw new Error("Version must match X.Y.Z-beta");
  const current = readJson("package.json").version;
  if (pattern.test(current) && compare(next, current) >= 0 === false) throw new Error("Version cannot move backwards");
  for (const path of manifests) {
    const absolute = resolve(root, path);
    const manifest = JSON.parse(readFileSync(absolute, "utf8"));
    manifest.version = next;
    writeFileSync(absolute, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command = "check", value] = process.argv.slice(2);
  try {
    if (command === "set") setVersion(value);
    else if (command === "current") console.log(displayVersion(validate()));
    else if (command === "check") console.log(`${displayVersion(validate())} is consistent`);
    else throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`[release] ${error.message}`);
    process.exitCode = 1;
  }
}
