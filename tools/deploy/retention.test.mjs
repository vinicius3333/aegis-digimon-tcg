import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  utimesSync,
  existsSync,
  symlinkSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { planArtifactRetention, retainArtifacts } from "./retention.mjs";
const day = 86400000;
function fixture(t) {
  const state = mkdtempSync(`${tmpdir()}/aegis-retention-`);
  t.after(() => rmSync(state, { recursive: true, force: true }));
  for (const dir of ["slots", "releases", "assets/card-images"]) mkdirSync(`${state}/${dir}`, { recursive: true });
  const manifest = {
    version: 1,
    active: { slot: "blue", revision: "live" },
    webRevision: "web-only",
    draining: [{ slot: "red", revision: "draining" }],
  };
  const now = Date.now();
  for (const [i, revision] of [
    "live",
    "web-only",
    "draining",
    "orphan",
    "old-a",
    "old-b",
    "old-c",
    "old-d",
    "old-e",
    "recent",
  ].entries()) {
    mkdirSync(`${state}/releases/${revision}/web/assets`, { recursive: true });
    for (const asset of [`${revision}.js`, "shared.js"]) {
      writeFileSync(`${state}/releases/${revision}/web/assets/${asset}`, "content");
      writeFileSync(`${state}/assets/${asset}`, "content");
      utimesSync(`${state}/assets/${asset}`, new Date(now - 20 * day), new Date(now - 20 * day));
    }
    const modified = revision === "recent" ? now : now - (20 + i) * day;
    utimesSync(`${state}/releases/${revision}`, new Date(modified), new Date(modified));
  }
  for (const [slot, revision] of [
    ["blue", "live"],
    ["red", "draining"],
    ["g-123456789abc", "orphan"],
  ]) {
    mkdirSync(`${state}/slots/${slot}`);
    writeFileSync(
      `${state}/slots/${slot}/compose.json`,
      JSON.stringify({
        services: Object.fromEntries(
          [1, 2, 3].map((index) => [`api${index}`, { environment: { AEGIS_REVISION: revision } }]),
        ),
      }),
    );
  }
  writeFileSync(`${state}/assets/manual.txt`, "keep");
  writeFileSync(`${state}/assets/card-images/card.webp`, "keep");
  return { state, manifest, now };
}
test("retention preserves live, draining, web-only, orphan, recent and shared assets", async (t) => {
  const f = fixture(t);
  const plan = planArtifactRetention({ ...f, keepLatest: 0 });
  assert.deepEqual(plan.expiredReleases, ["old-e", "old-d", "old-c", "old-b", "old-a"].reverse());
  assert.equal(plan.expiredAssets.includes("shared.js"), false);
  assert.equal(plan.expiredAssets.includes("manual.txt"), false);
  const calls = [];
  const run = async (_program, args) => {
    calls.push(args);
    if (args.includes("ls")) return "aegis-api:old-e";
    if (args.includes("inspect")) return JSON.stringify(new Date(f.now - 30 * day).toISOString());
    return "";
  };
  const report = await retainArtifacts({ ...f, run, dryRun: true });
  assert.ok(report.expiredReleases.length > 0);
  assert.ok(existsSync(`${f.state}/releases/old-e`));
  assert.equal(
    calls.some((args) => args.includes("rm")),
    false,
  );
  calls.length = 0;
  await retainArtifacts({ ...f, run });
  assert.equal(existsSync(`${f.state}/releases/old-e`), false);
  assert.equal(existsSync(`${f.state}/assets/old-e.js`), false);
  for (const revision of ["live", "web-only", "draining", "orphan", "recent"])
    assert.ok(existsSync(`${f.state}/releases/${revision}`));
  assert.ok(existsSync(`${f.state}/assets/shared.js`));
  assert.ok(existsSync(`${f.state}/assets/card-images/card.webp`));
  assert.ok(calls.every((args) => !args.includes("--force")));
});
test("unverifiable deployment metadata and asset symlinks prevent retention", (t) => {
  const f = fixture(t);
  writeFileSync(`${f.state}/slots/blue/compose.json`, "{}");
  assert.throws(() => planArtifactRetention(f), /cannot verify/);
  const g = fixture(t);
  symlinkSync("/tmp", `${g.state}/releases/live/web/assets/unsafe`);
  assert.throws(() => planArtifactRetention(g), /symlink/);
  assert.ok(existsSync(`${g.state}/releases/old-e`));
});

test("symlinked inventory roots, deployments and metadata fail before any deletion", async (t) => {
  for (const relative of [
    "assets",
    "slots",
    "releases",
    "slots/blue",
    "slots/blue/compose.json",
    "releases/live",
    "releases/live/web",
    "releases/live/web/assets",
  ]) {
    const f = fixture(t);
    const path = `${f.state}/${relative}`;
    const target = `${f.state}/relocated`;
    renameSync(path, target);
    symlinkSync(target, path);
    await assert.rejects(
      retainArtifacts({
        ...f,
        run: async () => {
          assert.fail("must reject before Docker operations");
        },
      }),
      /Unverifiable/,
    );
    assert.ok(existsSync(`${f.state}/assets/old-e.js`));
    assert.ok(existsSync(`${f.state}/releases/old-e`));
  }
});
