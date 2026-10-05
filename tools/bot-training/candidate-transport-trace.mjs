// External instrumentation only; neither the delivery tool nor room logic changes.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const config = JSON.parse(readFileSync(process.env.AEGIS_DELIVERY_TRACE_CONFIG, "utf8"));
const { InferenceClient } = await import(
  pathToFileURL(join(config.runtime, "apps/api/dist/bot/training/inferenceClient.js"))
);
const originalStart = InferenceClient.start;
const originalChoose = InferenceClient.prototype.choose;
const ready = [];
const queries = [];

InferenceClient.start = async function (options) {
  if (!isDeepStrictEqual(options.metadata, config.metadata)) throw new Error("Trace runtime metadata mismatch");
  const started = performance.now();
  const client = await originalStart.call(this, options);
  if (client.checkpointSha256 !== config.checkpointSha256) {
    await client.close();
    throw new Error("Trace actual loaded checkpoint mismatch");
  }
  ready.push({ checkpointSha256: client.checkpointSha256, readyMs: performance.now() - started });
  return client;
};

InferenceClient.prototype.choose = async function (window, signal) {
  const started = performance.now();
  try {
    const action = await originalChoose.call(this, window, signal);
    queries.push({ action, candidates: window.actions.length, latencyMs: performance.now() - started, error: false });
    return action;
  } catch (error) {
    queries.push({ latencyMs: performance.now() - started, error: true });
    throw error;
  }
};

process.once("exit", (exitCode) => {
  writeFileSync(
    config.output,
    JSON.stringify(
      {
        phase: config.phase,
        status: "candidate-integrity-only",
        acceptance: false,
        policyTimeoutMs: 1000,
        transportTimeoutMs: 2000,
        exitCode,
        checkpointSha256: config.checkpointSha256,
        ready,
        queries,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
});
