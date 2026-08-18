import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bumpVersion, cardChangesForPaths, parseConventionalCommit, renderChangelog, renderWebReleaseData, requiredBump } from "./release-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const requestedBump = process.argv[2];
if (requestedBump && !["major", "minor", "patch"].includes(requestedBump)) {
  throw new Error("Usage: pnpm release:prepare [major|minor|patch]");
}
const read = (path) => readFileSync(resolve(root, path), "utf8");
const write = (path, contents) => writeFileSync(resolve(root, path), contents);
const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const latestTag = git(["tag", "--merged", "HEAD", "--sort=-v:refname"]).split("\n").find((tag) => /^v\d+\.\d+\.\d+$/u.test(tag));

if (!latestTag) throw new Error("No production tag found. Tag the deployed v1.0.0 release before preparing the next release.");

// Merge commits only describe how already-reviewed commits reached the release branch;
// they are not additional user-facing changes and commonly use Git's non-Conventional
// `Merge ...` subject. Inspect their contained commits through the normal range while
// excluding the merge wrappers from changelog parsing.
const rawCommits = git(["log", "--no-merges", "--format=%s%x1f%b%x1e", `${latestTag}..HEAD`]);
const commits = rawCommits.split("\x1e").filter(Boolean).map((entry) => {
  const [subject, body] = entry.split("\x1f");
  const parsed = parseConventionalCommit(subject, body);
  if (!parsed) throw new Error(`Commit is not conventional: ${subject}`);
  return parsed;
});
const detectedBump = requiredBump(commits);
const bump = requestedBump ?? detectedBump;
if (!bump) throw new Error("No releasable commits since the last tag. Use feat:, fix:, perf:, or a breaking change.");
if (requestedBump && ["patch", "minor", "major"].indexOf(requestedBump) < ["patch", "minor", "major"].indexOf(detectedBump)) {
  throw new Error(`Requested ${requestedBump}, but the commits require at least ${detectedBump}.`);
}

const rootPackage = JSON.parse(read("package.json"));
const version = bumpVersion(rootPackage.version, bump);
const changedPaths = git(["diff", "--name-only", `${latestTag}..HEAD`]).split("\n").filter(Boolean);
const changes = cardChangesForPaths(changedPaths);
if (!changes.length) throw new Error("No changed cards were found for the changelog.");
const releases = JSON.parse(read("releases.json")).releases;
const release = { version, date: new Date().toISOString().slice(0, 10), changes };
const updatedReleases = [release, ...releases];

for (const path of ["package.json", "apps/api/package.json", "apps/web/package.json", "packages/shared/package.json"]) {
  const pkg = JSON.parse(read(path));
  pkg.version = version;
  write(path, `${JSON.stringify(pkg, null, 2)}\n`);
}
write("releases.json", `${JSON.stringify({ releases: updatedReleases }, null, 2)}\n`);
write("CHANGELOG.md", renderChangelog(updatedReleases));
write("apps/web/src/release.ts", renderWebReleaseData(version, updatedReleases));
console.log(`Prepared v${version} (${bump}) from ${commits.length} conventional commit(s). Review the generated release PR before merging.`);
