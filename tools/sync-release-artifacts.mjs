import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderChangelog, renderWebReleaseData } from "./release-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const write = (path, contents) => writeFileSync(resolve(root, path), contents);
const { version } = JSON.parse(read("package.json"));
const { releases } = JSON.parse(read("releases.json"));

write("CHANGELOG.md", renderChangelog(releases));
write("apps/web/src/release.ts", renderWebReleaseData(version, releases));
console.log(`Synchronized release artifacts for v${version}.`);
