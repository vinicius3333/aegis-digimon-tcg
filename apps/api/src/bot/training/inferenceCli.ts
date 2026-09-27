import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { Seat } from "@aegis/shared";
import type { TrainingWindow } from "./policy.js";

// Dedicated local evaluation process: disable external reporting and keep stdout JSONL.
process.env.NODE_ENV = "test";
console.log = (...values: unknown[]) => console.error(...values);

const { values } = parseArgs({
  options: {
    checkpoint: { type: "string" },
    output: { type: "string" },
    python: { type: "string", default: "python3" },
    script: {
      type: "string",
      default: fileURLToPath(new URL("../../../../../tools/bot-training/inference.py", import.meta.url)),
    },
    games: { type: "string", default: "8" },
    seed: { type: "string", default: "800000" },
    "max-decisions": { type: "string", default: "512" },
  },
});
if (!values.checkpoint || !values.output) throw new Error("--checkpoint and --output are required");
const games = Number(values.games);
const seed = Number(values.seed);
const maxDecisions = Number(values["max-decisions"]);
if (
  ![games, maxDecisions].every((value) => Number.isSafeInteger(value) && value > 0) ||
  !Number.isSafeInteger(seed) ||
  seed < 0
)
  throw new Error("Invalid inference evaluation limits");
const output = resolve(values.output);
if (existsSync(output)) throw new Error("Use a new inference output directory");
mkdirSync(output, { recursive: true });

const { runBotMatch } = await import("../matchHarness.js");
const { createAsyncTrainingPolicy } = await import("./policy.js");
const { mainActionReady } = await import("./actions.js");
const { trainingDeck, TRAINING_DECK_VERSIONS } = await import("./decks.js");
const { trainingMetadata } = await import("./metadata.js");
const { InferenceClient } = await import("./inferenceClient.js");
const metadata = trainingMetadata();
const client = await InferenceClient.start({
  command: values.python,
  args: [resolve(values.script), "--checkpoint", resolve(values.checkpoint), "--device", "cpu"],
  metadata,
  requestTimeoutMs: 2_000,
});

const results: unknown[] = [];
let failed = false;
try {
  writeFileSync(
    join(output, "config.json"),
    JSON.stringify(
      { games, seed, maxDecisions, device: "cpu", metadata, checkpointSha256: client.checkpointSha256 },
      null,
      2,
    ),
  );
  for (let index = 0; index < games; index++) {
    const learnerSeat = (Math.floor(index / 4) % 2) as Seat;
    const versions = [TRAINING_DECK_VERSIONS[Math.floor(index / 2) % 2]!, TRAINING_DECK_VERSIONS[index % 2]!];
    const stop = new AbortController();
    let decisions = 0;
    const latencies: number[] = [];
    const choose = async (window: TrainingWindow, signal: AbortSignal): Promise<number> => {
      if (decisions >= maxDecisions) {
        stop.abort("decisionLimit");
        // Let the harness close the game and dispose its driver, without a fabricated move.
        return new Promise<number>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      }
      decisions++;
      const started = performance.now();
      const action = await client.choose(window, signal);
      latencies.push(performance.now() - started);
      return action;
    };
    const seats = versions.map((version, seat) => ({
      deck: trainingDeck(version).deck,
      label: version,
      ...(seat === learnerSeat
        ? {
            policyFactory: (engine: Parameters<typeof createAsyncTrainingPolicy>[0], activeSeat: Seat) =>
              createAsyncTrainingPolicy(engine, activeSeat, choose),
            canChooseMainAction: mainActionReady,
            maxMainPhaseActions: Infinity,
          }
        : {}),
    }));
    const match = await runBotMatch({
      seed: seed + index,
      seats: [seats[0]!, seats[1]!],
      signal: stop.signal,
      captureEvents: true,
    });
    const asyncRejections = match.events!.filter((event) => event.kind === "actionRejected");
    const fallback = match.seats[learnerSeat].inferenceFallbacks;
    const errors =
      match.errors.length + match.rejections.length + asyncRejections.length + fallback.error + fallback.timeout;
    failed ||= errors > 0;
    const record = {
      seed: seed + index,
      learnerSeat,
      decks: versions,
      decisions,
      winnerSeat: match.winnerSeat,
      reason: stop.signal.aborted ? "decisionLimit" : match.reason,
      terminated: match.events!.some((event) => event.kind === "gameOver"),
      truncated: match.timedOut || stop.signal.aborted,
      errors: match.errors,
      rejections: match.rejections,
      asyncRejections,
      fallback,
      inferenceLatenciesMs: [...latencies],
    };
    results.push(record);
    writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
    process.stdout.write(JSON.stringify({ ...record, inferenceLatenciesMs: undefined }) + "\n");
    if (errors > 0 || match.reason === "stalled") {
      failed = true;
      break;
    }
  }
} finally {
  await client.close();
}
process.exit(failed ? 1 : 0);
