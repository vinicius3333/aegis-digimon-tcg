import { lstatSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isDeploymentSlot } from "./shared.mjs";
const DAY = 24 * 60 * 60 * 1000;
const REVISION = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

function requireDirectory(path) {
  if (!lstatSync(path).isDirectory()) throw new Error(`Unverifiable directory ${path}; retention refused`);
}

function filesUnder(root, prefix = "", excluded = new Set()) {
  requireDirectory(join(root, prefix));
  const files = new Set();
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (excluded.has(relative)) continue;
    if (entry.isSymbolicLink()) throw new Error("Artifact inventory contains a symlink; retention refused");
    if (entry.isDirectory()) {
      for (const file of filesUnder(root, relative, excluded)) files.add(file);
    } else if (entry.isFile()) files.add(relative);
    else throw new Error("Artifact inventory contains an unknown file type; retention refused");
  }
  return files;
}

export function planArtifactRetention({ state, manifest, now = Date.now(), days = 7, keepLatest = 5 }) {
  for (const path of [state, `${state}/slots`, `${state}/releases`, `${state}/assets`]) requireDirectory(path);
  const protectedRevisions = new Set([
    manifest.active.revision,
    manifest.webRevision ?? manifest.active.revision,
    ...manifest.draining.map((entry) => entry.revision),
  ]);
  // Orphan deployments can still own rooms, so their images and bundles stay protected too.
  for (const entry of readdirSync(`${state}/slots`, { withFileTypes: true })) {
    if (!isDeploymentSlot(entry.name)) continue;
    requireDirectory(`${state}/slots/${entry.name}`);
    const configPath = `${state}/slots/${entry.name}/compose.json`;
    if (!lstatSync(configPath).isFile()) throw new Error(`Unverifiable metadata ${configPath}; retention refused`);
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const revisions = [1, 2, 3].map((index) => config.services?.[`api${index}`]?.environment?.AEGIS_REVISION);
    if (
      revisions.some((revision) => typeof revision !== "string" || !REVISION.test(revision)) ||
      new Set(revisions).size !== 1
    ) {
      throw new Error(`Artifact retention cannot verify ${entry.name}; all artifacts retained`);
    }
    protectedRevisions.add(revisions[0]);
  }
  const cutoff = now - days * DAY;
  const releases = readdirSync(`${state}/releases`, { withFileTypes: true })
    .filter((entry) => REVISION.test(entry.name))
    .map((entry) => {
      requireDirectory(`${state}/releases/${entry.name}`);
      return { revision: entry.name, modified: lstatSync(`${state}/releases/${entry.name}`).mtimeMs };
    })
    .sort((a, b) => b.modified - a.modified || a.revision.localeCompare(b.revision));
  const kept = new Set([
    ...protectedRevisions,
    ...releases.slice(0, keepLatest).map((entry) => entry.revision),
    ...releases.filter((entry) => entry.modified >= cutoff).map((entry) => entry.revision),
  ]);
  const expired = releases.filter((entry) => !kept.has(entry.revision)).map((entry) => entry.revision);
  const retainedAssets = new Set();
  const expiredAssets = new Set();
  for (const { revision } of releases) {
    const assetPath = `${state}/releases/${revision}/web/assets`;
    requireDirectory(`${state}/releases/${revision}/web`);
    const destination = kept.has(revision) ? retainedAssets : expiredAssets;
    for (const file of filesUnder(assetPath)) destination.add(file);
  }
  for (const revision of protectedRevisions) {
    if (!releases.some((release) => release.revision === revision))
      throw new Error(`Protected release ${revision} is missing; retention refused`);
  }
  const sharedAssets = filesUnder(`${state}/assets`, "", new Set(["card-images"]));
  const assets = [...expiredAssets].filter(
    (file) =>
      sharedAssets.has(file) && !retainedAssets.has(file) && lstatSync(join(state, "assets", file)).mtimeMs < cutoff,
  );
  return { protectedRevisions: [...kept], expiredReleases: expired, expiredAssets: assets, cutoff };
}

export async function retainArtifacts({ state, manifest, run, dryRun = false, now = Date.now() }) {
  const plan = planArtifactRetention({ state, manifest, now });
  // Plan everything before deleting anything; malformed metadata fails closed.
  const imageTags = [];
  for (const repository of ["aegis-api", "aegis-static"]) {
    const tags = (
      await run("docker", ["image", "ls", repository, "--format", "{{.Repository}}:{{.Tag}}"], { capture: true })
    )
      .split("\n")
      .filter(Boolean);
    for (const tag of tags) {
      const revision = tag.slice(repository.length + 1);
      if (!REVISION.test(revision) || plan.protectedRevisions.includes(revision)) continue;
      const created = JSON.parse(
        await run("docker", ["image", "inspect", "--format", "{{json .Created}}", tag], { capture: true }),
      );
      const timestamp = Date.parse(created);
      if (Number.isFinite(timestamp) && timestamp < plan.cutoff) imageTags.push(tag);
    }
  }
  if (!dryRun) {
    for (const revision of plan.expiredReleases) rmSync(`${state}/releases/${revision}`, { recursive: true });
    for (const file of plan.expiredAssets) rmSync(join(state, "assets", file));
    for (const tag of imageTags) {
      try {
        // No force: Docker refuses removal of images still owned by containers.
        await run("docker", ["image", "rm", tag], { capture: true });
      } catch {
        console.log(`${tag}: image still referenced or unverifiable; retained`);
      }
    }
  }
  const report = {
    dryRun,
    retainedRevisions: plan.protectedRevisions,
    expiredReleases: plan.expiredReleases,
    expiredAssetCount: plan.expiredAssets.length,
    expiredImages: imageTags,
  };
  console.log(`Artifact retention: ${JSON.stringify(report)}`);
  return report;
}
