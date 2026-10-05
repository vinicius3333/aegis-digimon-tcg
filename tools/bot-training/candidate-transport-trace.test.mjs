import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const preload = join(here, "candidate-transport-trace.mjs");
const transport = join(here, "../../apps/api/src/bot/training/inferenceClient.ts");

function fixture(t, expectedHash = "a".repeat(64), noCandidates = false) {
  const root = mkdtempSync(join(tmpdir(), "aegis-candidate-trace-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const folder = join(root, "apps/api/dist/bot/training");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "inferenceClient.js"), `export { InferenceClient } from ${JSON.stringify(transport)};`);
  const metadata = {
    schemaVersion: 4,
    engineSha256: "explicit-fixture",
    decks: [],
    cardIds: [],
    keywords: [],
    statusFields: [],
  };
  const output = join(root, "trace.json");
  const config = join(root, "config.json");
  writeFileSync(
    config,
    JSON.stringify({ phase: "package-probe", runtime: root, metadata, checkpointSha256: expectedHash, output }),
  );
  const driver = join(root, "driver.mjs");
  const ready = { type: "ready", protocolVersion: 1, featureVersion: 7, metadata, checkpointSha256: "a".repeat(64) };
  const worker = `console.log(JSON.stringify(${JSON.stringify(ready)}));require('node:readline').createInterface({input:process.stdin}).on('line', line=>{const r=JSON.parse(line);console.log(JSON.stringify({type:'choice',requestId:r.requestId,action:r.window.actions.length-1}));});`;
  writeFileSync(
    driver,
    `
    import { InferenceClient } from ${JSON.stringify(join(folder, "inferenceClient.js"))};
    const client = await InferenceClient.start({command:process.execPath,args:['-e',${JSON.stringify(worker)}],metadata:${JSON.stringify(metadata)}});
    try {
      await client.choose({actions:${noCandidates ? "[]" : "[{},{}]"}},new AbortController().signal);
      await client.choose({actions:[{}]},new AbortController().signal);
    } finally { await client.close(); }
  `,
  );
  const result = spawnSync(process.execPath, ["--import", preload, driver], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, AEGIS_DELIVERY_TRACE_CONFIG: config },
  });
  return { result, proof: JSON.parse(readFileSync(output, "utf8")) };
}

test("external trace records real Node transport readiness and per-query timing for an explicit fake scorer", (t) => {
  const { result, proof } = fixture(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(proof.acceptance, false);
  assert.equal(proof.ready.length, 1);
  assert.equal(proof.ready[0].checkpointSha256, "a".repeat(64));
  assert.deepEqual(
    proof.queries.map((row) => row.action),
    [1, 0],
  );
  assert.ok(proof.ready[0].readyMs >= 0);
  assert.ok(proof.queries.every((row) => Number.isFinite(row.latencyMs) && row.latencyMs >= 0 && row.error === false));
  assert.equal(proof.policyTimeoutMs, 1000);
  assert.equal(proof.transportTimeoutMs, 2000);
});

test("wrong actually loaded checkpoint fails before any choice and closes the stand-in worker", (t) => {
  const { result, proof } = fixture(t, "f".repeat(64));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /actual loaded checkpoint mismatch/);
  assert.deepEqual(proof.ready, []);
  assert.deepEqual(proof.queries, []);
  assert.equal(proof.acceptance, false);
});

test("transport rejection remains an error and cannot silently produce a heuristic choice", (t) => {
  const { result, proof } = fixture(t, "a".repeat(64), true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No inference candidates/);
  assert.equal(proof.queries.length, 1);
  assert.equal(proof.queries[0].error, true);
  assert.equal(proof.acceptance, false);
});
