import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  candidateEnvironment,
  checkPythonPackages,
  checkReady,
  checkScope,
  packCandidate,
  sha256,
  validatePackage,
} from "./delivery.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = join(HERE, "delivery.mjs");
const TRANSPORT = join(HERE, "../../apps/api/src/bot/training/inferenceClient.ts");
const cardIds = [
  ...Array.from({ length: 104 }, (_, i) => `BT26-${String(i + 1).padStart(3, "0")}`),
  ...Array.from({ length: 77 }, (_, i) => `EX13-${String(i + 1).padStart(3, "0")}`),
  ...Array.from({ length: 298 }, (_, i) => `FIXTURE-${i}`),
];
const decks = Array.from({ length: 44 }, (_, i) => ({
  version: `fixture-recipe-${i}@1`,
  name: `Fixture ${i}`,
  sha256: "b".repeat(64),
}));
const metadata = {
  schemaVersion: 4,
  engineSha256: "a".repeat(64),
  cardIds,
  decks: decks.slice(0, 26),
  keywords: [],
  statusFields: [],
};
const curriculum = { schemaVersion: 1, engineSha256: metadata.engineSha256, decks };

function fixture(t, readyChanges = {}, packageChanges = {}) {
  const root = mkdtempSync(join(tmpdir(), "aegis-delivery-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const runtime = join(root, "runtime");
  for (const folder of ["apps/api/dist/bot/training", "packages/shared/dist", "tools/bot-training"])
    mkdirSync(join(runtime, folder), { recursive: true });
  const checkpoint = join(root, "synthetic.pt");
  writeFileSync(checkpoint, "Explicit synthetic checkpoint bytes; no trained model or acceptance");
  const checkpointSha256 = sha256(readFileSync(checkpoint));
  const ready = { type: "ready", protocolVersion: 1, featureVersion: 7, metadata, checkpointSha256, ...readyChanges };
  writeFileSync(
    join(runtime, "apps/api/dist/bot/training/cli.js"),
    `console.log(JSON.stringify(process.argv.includes('--describe-curriculum') ? ${JSON.stringify(curriculum)} : ${JSON.stringify(metadata)}));`,
  );
  writeFileSync(
    join(runtime, "apps/api/dist/index.js"),
    "console.log(JSON.stringify({ checkpoint: process.env.AEGIS_BOT_CHECKPOINT, scorer: process.env.AEGIS_BOT_PYTHON, unrelated: process.env.AEGIS_EXISTING_SETTING }));",
  );
  // Exercise the actual Node transport, without building or copying any dependency graph.
  writeFileSync(
    join(runtime, "apps/api/dist/bot/training/inferenceClient.js"),
    `export { InferenceClient } from ${JSON.stringify(TRANSPORT)};`,
  );
  writeFileSync(
    join(runtime, "tools/bot-training/inference.py"),
    "# Explicit fake protocol worker; never imported as Python\n",
  );
  writeFileSync(join(runtime, "tools/bot-training/pyproject.toml"), "# Synthetic dependency identity fixture\n");
  writeFileSync(join(runtime, "pnpm-lock.yaml"), "# Synthetic runtime lock fixture\n");
  const python = join(root, "fake-python");
  writeFileSync(
    python,
    `#!${process.execPath}\n
    if (process.argv.includes('--version')) { console.log('Python 3.12.14'); }
    else if (process.argv.includes('-c')) { console.log(JSON.stringify(${JSON.stringify({ torch: "2.7.1", numpy: "2.2.6", click: "8.1.8", ...packageChanges })})); }
    else {
      console.log(JSON.stringify(${JSON.stringify(ready)}));
      import('node:readline').then(({createInterface}) => createInterface({input:process.stdin}).on('line', line => {
        const request = JSON.parse(line);
        console.log(JSON.stringify({type:'choice', requestId:request.requestId, action:request.window.actions.length-1}));
      }));
    }
  `,
  );
  chmodSync(python, 0o755);
  const evidence = join(root, "source-receipt.json");
  writeFileSync(evidence, JSON.stringify({ fixture: true, accepted: false }));
  const provenance = join(root, "provenance.json");
  writeFileSync(
    provenance,
    JSON.stringify({
      sourceCommit: "c".repeat(40),
      sourceArchiveSha256: "d".repeat(64),
      originalCheckpointSha256: checkpointSha256,
      evidence: [{ path: evidence, role: "explicit fixture", sha256: sha256(readFileSync(evidence)) }],
    }),
  );
  const options = {
    runtime,
    checkpoint,
    checkpointSha256,
    provenance,
    output: join(root, "package"),
    version: "explicit-fixture-candidate",
    python,
  };
  const packed = packCandidate(options);
  return {
    root,
    runtime,
    checkpoint,
    evidence,
    options,
    packed,
    manifest: JSON.parse(readFileSync(join(packed.package, "manifest.json"), "utf8")),
  };
}

function cli(args, environment = {}) {
  return spawnSync(process.execPath, [TOOL, ...args], {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, NODE_ENV: "test", ...environment },
  });
}

test("preserves original checkpoint and pins a candidate; cannot overwrite another version", (t) => {
  const f = fixture(t);
  assert.equal(f.manifest.status, "candidate");
  assert.equal(f.manifest.policyTimeoutMs, 1000);
  assert.equal(f.manifest.featureVersion, 7);
  assert.equal(sha256(readFileSync(f.checkpoint)), f.options.checkpointSha256);
  assert.deepEqual(readFileSync(f.checkpoint), readFileSync(join(f.packed.package, "checkpoint.pt")));
  assert.equal(validatePackage(f.packed.package, f.packed.manifestSha256).version, f.options.version);
  assert.throws(() => packCandidate(f.options), /EEXIST/);
  assert.throws(() => packCandidate({ ...f.options, checkpointSha256: "f".repeat(64) }), /Checkpoint hash/);
});

test("requires complete vocabulary, catalog and support scope; never infers mastery", () => {
  checkScope(metadata, curriculum);
  for (const mutate of [
    (m) => m.cardIds.splice(0, 1),
    (m) => {
      m.cardIds[0] = m.cardIds[1];
    },
    (m) => {
      m.cardIds[0] = "OTHER-IDENTITY";
    },
    (m) => {
      m.schemaVersion = 3;
    },
    (m) => m.decks.pop(),
  ]) {
    const m = structuredClone(metadata);
    mutate(m);
    assert.throws(() => checkScope(m, curriculum));
  }
  assert.throws(() => checkScope(metadata, { ...curriculum, decks: decks.slice(0, 42) }));
  assert.throws(() => checkScope(metadata, { ...curriculum, engineSha256: "f".repeat(64) }));
  assert.throws(() => checkScope(metadata, { ...curriculum, decks: [...decks].reverse() }));
});

test("rejects modified checkpoint, receipt, scorer, manifest and runtime before launching", async (t) => {
  for (const target of ["checkpoint.pt", "provenance.json", "scorer.mjs", "manifest.json", "receipt", "runtime"]) {
    await t.test(target, (childTest) => {
      const f = fixture(childTest);
      const path =
        target === "receipt"
          ? f.evidence
          : target === "runtime"
            ? join(f.runtime, "apps/api/dist/index.js")
            : join(f.packed.package, target);
      chmodSync(path, 0o644);
      writeFileSync(path, "corrupt fixture");
      assert.throws(() => validatePackage(f.packed.package, f.packed.manifestSha256));
    });
  }
});

test("rejects unexpected files and external manifest pins", (t) => {
  const f = fixture(t);
  assert.throws(() => validatePackage(f.packed.package, "f".repeat(64)), /external pin/);
  writeFileSync(join(f.packed.package, "extra.json"), "{}");
  assert.throws(() => validatePackage(f.packed.package, f.packed.manifestSha256), /Unexpected package contents/);
});

test("loaded readiness must bind actual model bytes, feature version, protocol and full metadata", (t) => {
  const f = fixture(t);
  const ready = {
    type: "ready",
    protocolVersion: 1,
    featureVersion: 7,
    metadata,
    checkpointSha256: f.options.checkpointSha256,
  };
  checkReady(ready, f.manifest);
  for (const changes of [
    { checkpointSha256: "f".repeat(64) },
    { featureVersion: 6 },
    { protocolVersion: 2 },
    { metadata: { ...metadata, engineSha256: "f".repeat(64) } },
    { type: "choice" },
  ])
    assert.throws(() => checkReady({ ...ready, ...changes }, f.manifest), /differs from package/);
});

test("candidate launcher requires opt-in, blocks production and preserves unrelated API configuration", (t) => {
  const f = fixture(t);
  const args = ["launch", "--package", f.packed.package, "--manifest-sha256", f.packed.manifestSha256];
  const refused = cli(args);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /explicit --allow-candidate/);
  assert.equal(refused.stdout, "");
  const production = cli([...args, "--allow-candidate"], { NODE_ENV: "production" });
  assert.notEqual(production.status, 0);
  assert.match(production.stderr, /cannot launch production/);
  const launched = cli([...args, "--allow-candidate"], {
    AEGIS_EXISTING_SETTING: "preserved",
    AEGIS_BOT_CHECKPOINT: "/wrong.pt",
  });
  assert.equal(launched.status, 0, launched.stderr);
  const config = JSON.parse(launched.stdout);
  assert.equal(config.checkpoint, join(f.packed.package, "checkpoint.pt"));
  assert.equal(config.scorer, join(f.packed.package, "scorer.mjs"));
  assert.equal(config.unrelated, "preserved");
  assert.match(launched.stderr, /qualification remains pending/);
  assert.throws(() =>
    candidateEnvironment(f.packed.package, f.packed.manifestSha256, f.manifest, { NODE_ENV: "production" }),
  );
});

test("CLI probe uses the actual InferenceClient and guarded protocol with explicit synthetic scorer", (t) => {
  const f = fixture(t);
  const queries = join(f.root, "queries.json");
  writeFileSync(queries, JSON.stringify([{ actions: [{}, {}] }, { actions: [{}] }]));
  const output = join(f.root, "probe");
  const result = cli([
    "probe",
    "--package",
    f.packed.package,
    "--manifest-sha256",
    f.packed.manifestSha256,
    "--allow-candidate",
    "--queries",
    queries,
    "--output",
    output,
  ]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(readFileSync(join(output, "queries.json"), "utf8"));
  assert.deepEqual(report.choices, [1, 0]);
  assert.equal(report.checkpointSha256, f.options.checkpointSha256);
  assert.equal(report.acceptance, false);
  assert.equal(report.status, "candidate");
});

test("guard kills a scorer whose loaded hash differs even when package checkpoint bytes match", (t) => {
  const f = fixture(t, { checkpointSha256: "f".repeat(64) });
  const queries = join(f.root, "queries.json");
  writeFileSync(queries, JSON.stringify([{ actions: [{}] }]));
  const result = cli([
    "probe",
    "--package",
    f.packed.package,
    "--manifest-sha256",
    f.packed.manifestSha256,
    "--allow-candidate",
    "--queries",
    queries,
    "--output",
    join(f.root, "failed-probe"),
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Loaded checkpoint\/version\/runtime differs/);
});

test("guard refuses a different checkpoint/device invocation", (t) => {
  const f = fixture(t);
  const environment = candidateEnvironment(f.packed.package, f.packed.manifestSha256, f.manifest, {
    ...process.env,
    NODE_ENV: "test",
  });
  const result = spawnSync(
    process.execPath,
    [
      join(f.packed.package, "scorer.mjs"),
      join(f.runtime, "tools/bot-training/inference.py"),
      "--checkpoint",
      f.checkpoint,
      "--device",
      "cuda",
    ],
    { encoding: "utf8", timeout: 30_000, env: environment },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unexpected scorer invocation/);
  assert.equal(result.stdout, "");
});

test("pinned package copy can be used to validate its version independently", (t) => {
  const f = fixture(t);
  const result = spawnSync(
    process.execPath,
    [
      join(f.packed.package, "scorer.mjs"),
      "validate",
      "--package",
      f.packed.package,
      "--manifest-sha256",
      f.packed.manifestSha256,
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).modelLoaded, false);
});

test("pending delivery request fails before consuming or creating checkpoint files", (t) => {
  const root = mkdtempSync(join(tmpdir(), "aegis-delivery-pending-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const request = join(root, "request.json");
  writeFileSync(
    request,
    JSON.stringify({
      version: "pending-candidate",
      checkpoint: null,
      checkpointSha256: null,
      output: join(root, "package"),
    }),
  );
  const result = cli(["pack", "--request", request]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Checkpoint hash differs from declared candidate/);
  assert.equal(result.stdout, "");
});

test("accepts the authorized CUDA Torch build while pinning its complete installed identity", (t) => {
  const f = fixture(t, {}, { torch: "2.7.1+cu128" });
  assert.equal(f.manifest.runtime.python.packages.torch, "2.7.1+cu128");
  assert.equal(validatePackage(f.packed.package, f.packed.manifestSha256).runtime.python.packages.torch, "2.7.1+cu128");
  for (const torch of ["2.7.2", "2.8.0", "2.7.1rc1", "2.7.1+", "2.7.1+cu128+other"]) {
    assert.throws(() => checkPythonPackages({ torch, numpy: "2.2.6", click: "8.1.8" }), /dependencies differ/);
  }
});
