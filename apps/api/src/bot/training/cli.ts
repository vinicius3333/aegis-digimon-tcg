import { readSync, writeSync } from "node:fs";
import type { Seat } from "@aegis/shared";
import type { TrainingWindow } from "./policy.js";

// This is a dedicated, one-match headless process. Suppress application logging
// and external alert delivery before importing the engine; stdout is JSONL only.
process.env.NODE_ENV = "test";
console.log = (...values: unknown[]) => console.error(...values);

let pending = Buffer.alloc(0);
function readMessage(): unknown {
  for (;;) {
    const newline = pending.indexOf(10);
    if (newline >= 0) {
      const line = pending.subarray(0, newline).toString("utf8");
      pending = pending.subarray(newline + 1);
      return JSON.parse(line) as unknown;
    }
    const buffer = Buffer.alloc(4096);
    const count = readSync(0, buffer);
    if (count === 0) throw new Error("Training bridge input closed");
    pending = Buffer.concat([pending, buffer.subarray(0, count)]);
    if (pending.length > 1_000_000) throw new Error("Training bridge input exceeds limit");
  }
}

function send(message: unknown): void {
  writeSync(1, `${JSON.stringify(message)}\n`);
}
function fatal(error: unknown): never {
  send({ type: "error", message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}
process.on("unhandledRejection", fatal);
process.on("uncaughtException", fatal);

const { runBotMatch } = await import("../matchHarness.js");
const { createTrainingPolicy } = await import("./policy.js");
const { mainActionReady } = await import("./actions.js");
const { trainingDeck } = await import("./decks.js");
const { trainingMetadata } = await import("./metadata.js");
const metadata = trainingMetadata();

if (process.argv.includes("--describe")) {
  send(metadata);
  process.exit(0);
}

const input = readMessage() as {
  seed?: number;
  decks?: string[];
  learnerSeat?: number;
  maxDecisions?: number;
  turnLimit?: number;
  engineSha256?: string;
};
if (
  !Number.isSafeInteger(input.seed) ||
  !Array.isArray(input.decks) ||
  input.decks.length !== 2 ||
  !input.decks.every((deck) => typeof deck === "string") ||
  (input.learnerSeat !== 0 && input.learnerSeat !== 1)
) {
  fatal(new Error("Expected seed, two pinned deck versions, and learnerSeat (0 or 1)"));
}
const seed = input.seed!;
if (input.engineSha256 !== undefined && input.engineSha256 !== metadata.engineSha256)
  fatal(new Error("Worker code changed since training configuration was recorded"));
const learnerSeat = input.learnerSeat as Seat;
const decks = input.decks!.map(trainingDeck);
const maxDecisions = input.maxDecisions ?? 4000;
const turnLimit = input.turnLimit ?? 60;
if (!Number.isSafeInteger(maxDecisions) || maxDecisions < 1 || !Number.isSafeInteger(turnLimit) || turnLimit < 1)
  fatal(new Error("Invalid episode limits"));
let decisions = 0;
send({
  type: "ready",
  schemaVersion: 1,
  engineSha256: metadata.engineSha256,
  seed,
  learnerSeat,
  decks: decks.map(({ version, sha256 }) => ({ version, sha256 })),
});

function choose(window: TrainingWindow): number {
  if (++decisions > maxDecisions) {
    send({ type: "truncated", reason: "decisionLimit", decisions: decisions - 1 });
    process.exit(0);
  }
  const decisionId = `${seed}:${decisions}`;
  send({ type: "decision", decisionId, ...window });
  const reply = readMessage() as { decisionId?: string; action?: number };
  if (
    reply?.decisionId !== decisionId ||
    !Number.isInteger(reply.action) ||
    reply.action! < 0 ||
    reply.action! >= window.actions.length
  ) {
    fatal(new Error(`Invalid or stale response for ${decisionId}`));
  }
  return reply.action!;
}

const configurations = decks.map(({ deck, version }, index) => ({
  deck,
  label: version,
  ...(index === learnerSeat
    ? {
        policyFactory: (engine: Parameters<typeof createTrainingPolicy>[0], seat: Seat) =>
          createTrainingPolicy(engine, seat, choose),
        canChooseMainAction: mainActionReady,
        maxMainPhaseActions: Number.POSITIVE_INFINITY,
      }
    : {}),
}));
const result = await runBotMatch({
  seed,
  seats: [configurations[0]!, configurations[1]!],
  turnLimit,
  captureEvents: true,
});
const asyncRejections = result.events!.filter((event) => event.kind === "actionRejected");
send({
  type: "result",
  seed,
  learnerSeat,
  decisions,
  winnerSeat: result.winnerSeat,
  reason: result.reason,
  terminated: !result.timedOut && result.reason !== "stalled",
  truncated: result.timedOut,
  errors: result.errors,
  rejections: result.rejections,
  asyncRejections,
});
// A new process owns each episode, so truncated matches cannot leave a bot or
// a decision timeout running during the next reset.
process.exit(result.errors.length || result.rejections.length || asyncRejections.length ? 1 : 0);
