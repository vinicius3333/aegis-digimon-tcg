import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderChangelog, renderWebReleaseData } from "./release-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const packagePaths = ["package.json", "apps/api/package.json", "apps/web/package.json", "packages/shared/package.json"];
const read = (path) => readFileSync(resolve(root, path), "utf8");
const rootPackage = JSON.parse(read("package.json"));
const releaseData = JSON.parse(read("releases.json"));

if (!Array.isArray(releaseData.releases) || releaseData.releases.length === 0) {
  throw new Error("releases.json must contain at least one release.");
}

for (const path of packagePaths) {
  const { version } = JSON.parse(read(path));
  if (version !== rootPackage.version)
    throw new Error(`${path} has version ${version}; expected ${rootPackage.version}.`);
}

const [currentRelease] = releaseData.releases;
if (currentRelease.version !== rootPackage.version) {
  throw new Error(`Current release is ${currentRelease.version}; expected ${rootPackage.version}.`);
}

for (const release of releaseData.releases) {
  if (
    !/^\d+\.\d+\.\d+$/u.test(release.version) ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(release.date) ||
    !Array.isArray(release.changes) ||
    release.changes.length === 0
  ) {
    throw new Error(`Invalid release entry for ${release.version}.`);
  }
  for (const change of release.changes) {
    if (
      !["added", "changed", "fixed", "removed"].includes(change.type) ||
      typeof change.description !== "string" ||
      !change.description.trim()
    ) {
      throw new Error(`Invalid change in release ${release.version}.`);
    }
    if (
      change.translations !== undefined &&
      (change.translations === null ||
        typeof change.translations !== "object" ||
        Array.isArray(change.translations) ||
        Object.values(change.translations).some(
          (translation) => typeof translation !== "string" || !translation.trim(),
        ))
    ) {
      throw new Error(`Invalid translations in release ${release.version}.`);
    }
  }
}

if (read("CHANGELOG.md") !== renderChangelog(releaseData.releases)) {
  throw new Error("CHANGELOG.md is out of date. Run pnpm release:sync, or pnpm release:prepare for a new release.");
}

if (read("apps/web/src/release.ts") !== renderWebReleaseData(rootPackage.version, releaseData.releases)) {
  throw new Error(
    "apps/web/src/release.ts is out of date. Run pnpm release:sync, or pnpm release:prepare for a new release.",
  );
}

console.log(`Release files are consistent at v${rootPackage.version}.`);
