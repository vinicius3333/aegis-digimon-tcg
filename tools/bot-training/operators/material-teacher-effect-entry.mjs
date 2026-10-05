// External training worker for the effect DigiXros expert teacher. It mirrors the qualified
// training CLI (apps/api/src/bot/training/cli.ts SHA256
// 2140c324eb21b2ade84a90af59bb52afff308640fcf97351272400c4e9202a96, compiled to
// dist/bot/training/cli.js) line for line. Only two things differ: modules load from the
// qualified API dist by absolute path, and the teacher factory is the expert decorator of
// the qualified teacher. Its --describe and --describe-curriculum output is the qualified
// worker's own.
import { readSync, writeSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createEffectPlayTeacherFactory,
  loadQualifiedModules,
  qualifiedApiDist,
} from "./material-teacher-effect-policy.mjs";
// This is a dedicated, one-match headless process. Suppress application logging
// and external alert delivery before importing the engine; stdout is JSONL only.
process.env.NODE_ENV = "test";
console.log = (...values) => console.error(...values);
let pending = Buffer.alloc(0);
function readMessage() {
    for (;;) {
        const newline = pending.indexOf(10);
        if (newline >= 0) {
            const line = pending.subarray(0, newline).toString("utf8");
            pending = pending.subarray(newline + 1);
            return JSON.parse(line);
        }
        const buffer = Buffer.alloc(4096);
        const count = readSync(0, buffer);
        if (count === 0)
            throw new Error("Training bridge input closed");
        pending = Buffer.concat([pending, buffer.subarray(0, count)]);
        if (pending.length > 1_000_000)
            throw new Error("Training bridge input exceeds limit");
    }
}
function send(message) {
    writeSync(1, `${JSON.stringify(message)}\n`);
}
function fatal(error) {
    send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    process.exit(1);
}
process.on("unhandledRejection", fatal);
process.on("uncaughtException", fatal);
const apiDist = qualifiedApiDist();
const qualified = (path) => pathToFileURL(join(apiDist, path)).href;
const { runBotMatch } = await import(qualified("bot/matchHarness.js"));
const createExpertTeacher = createEffectPlayTeacherFactory(await loadQualifiedModules(apiDist));
const { createTrainingPolicy, unexplainedRejections } = await import(qualified("bot/training/policy.js"));
const { mainActionReady } = await import(qualified("bot/training/actions.js"));
const { episodeDeck, curriculumManifest } = await import(qualified("bot/training/curriculum.js"));
const { trainingMetadata } = await import(qualified("bot/training/metadata.js"));
const { costRefusalForfeit } = await import(qualified("bot/training/costRefusal.js"));
const metadata = trainingMetadata();
if (process.argv.includes("--describe")) {
    send(metadata);
    process.exit(0);
}
if (process.argv.includes("--describe-curriculum")) {
    send(curriculumManifest(metadata.engineSha256));
    process.exit(0);
}
const input = readMessage();
if (!Number.isSafeInteger(input.seed) ||
    !Array.isArray(input.decks) ||
    input.decks.length !== 2 ||
    !input.decks.every((deck) => typeof deck === "string") ||
    (input.learnerSeat !== 0 && input.learnerSeat !== 1)) {
    fatal(new Error("Expected seed, two pinned deck versions, and learnerSeat (0 or 1)"));
}
const seed = input.seed;
if ((input.forfeitOnCostRefusal !== undefined && typeof input.forfeitOnCostRefusal !== "boolean") ||
    (input.forfeitOnCostRefusal === true && input.teacher === true))
    fatal(new Error("Payment forfeits are only supported for policy training"));
if (input.opponent !== undefined && input.opponent !== "heuristic" && input.opponent !== "external")
    fatal(new Error("Opponent must be heuristic or external"));
if (input.opponent === "external" && input.teacher === true)
    fatal(new Error("Teacher demonstrations require the heuristic opponent"));
const externalOpponent = input.opponent === "external";
let trainingForfeit;
let learnerPolicy;
let opponentPolicy;
if (input.engineSha256 !== undefined && input.engineSha256 !== metadata.engineSha256)
    fatal(new Error("Worker code changed since training configuration was recorded"));
const learnerSeat = input.learnerSeat;
const decks = input.decks.map(episodeDeck);
const maxDecisions = input.maxDecisions ?? 4000;
const turnLimit = input.turnLimit ?? 60;
if (!Number.isSafeInteger(maxDecisions) || maxDecisions < 1 || !Number.isSafeInteger(turnLimit) || turnLimit < 1)
    fatal(new Error("Invalid episode limits"));
let decisions = 0;
let opponentDecisions = 0;
send({
    type: "ready",
    schemaVersion: 1,
    engineSha256: metadata.engineSha256,
    seed,
    learnerSeat,
    decks: decks.map(({ version, sha256 }) => ({ version, sha256 })),
});
function choose(window, role = "learner") {
    const count = role === "learner" ? ++decisions : ++opponentDecisions;
    if (count > maxDecisions) {
        send({ type: "truncated", reason: "decisionLimit", decisions, opponentDecisions });
        process.exit(0);
    }
    const decisionId = role === "learner" ? `${seed}:${count}` : `${seed}:opponent:${count}`;
    send({ type: "decision", decisionId, role, ...window });
    const reply = readMessage();
    if (reply?.decisionId !== decisionId ||
        !Number.isInteger(reply.action) ||
        reply.action < 0 ||
        reply.action >= window.actions.length) {
        fatal(new Error(`Invalid or stale response for ${decisionId}`));
    }
    return reply.action;
}
const configurations = decks.map(({ deck, version }, index) => ({
    deck,
    label: version,
    ...(index === learnerSeat
        ? {
            policyFactory: (engine, seat) => {
                const controller = input.forfeitOnCostRefusal === true
                    ? costRefusalForfeit(engine, seat, (failure) => {
                        trainingForfeit = failure;
                    })
                    : undefined;
                const policy = createTrainingPolicy(engine, seat, (window) => {
                    const actionIndex = choose(window);
                    controller?.observeChoice(window, actionIndex);
                    return actionIndex;
                }, input.teacher === true ? createExpertTeacher(engine, seat, seed) : undefined);
                learnerPolicy = policy;
                if (controller !== undefined) {
                    const recover = policy.onEngineRejection;
                    policy.onEngineRejection = (event) => {
                        controller.onEngineRejection(event);
                        if (trainingForfeit === undefined)
                            recover(event);
                    };
                }
                return policy;
            },
            canChooseMainAction: mainActionReady,
            maxMainPhaseActions: Number.POSITIVE_INFINITY,
        }
        : externalOpponent
            ? {
                policyFactory: (engine, seat) => {
                    opponentPolicy = createTrainingPolicy(engine, seat, (window) => choose(window, "opponent"));
                    return opponentPolicy;
                },
                canChooseMainAction: mainActionReady,
                maxMainPhaseActions: Number.POSITIVE_INFINITY,
            }
            : {}),
}));
const result = await runBotMatch({
    seed,
    seats: [configurations[0], configurations[1]],
    turnLimit,
    captureEvents: true,
});
const recoveredPlayRejections = learnerPolicy?.recoveredPlayRejections() ?? 0;
const opponentRecoveredPlayRejections = opponentPolicy?.recoveredPlayRejections() ?? 0;
const asyncRejections = unexplainedRejections(result.events, recoveredPlayRejections + opponentRecoveredPlayRejections);
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
    recoveredPlayRejections,
    opponentDecisions,
    opponentRecoveredPlayRejections,
    ...(trainingForfeit === undefined ? {} : { trainingForfeit }),
});
// A new process owns each episode, so truncated matches cannot leave a bot or
// a decision timeout running during the next reset.
const expectedForfeit = trainingForfeit !== undefined &&
    result.reason === "surrender" &&
    result.winnerSeat === (learnerSeat === 0 ? 1 : 0) &&
    !result.timedOut &&
    asyncRejections.length === 1 &&
    asyncRejections[0].intent === "playCard" &&
    asyncRejections[0].reason === "insufficient-memory";
process.exit(result.errors.length || result.rejections.length || (asyncRejections.length && !expectedForfeit) ? 1 : 0);
