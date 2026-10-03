import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";

// Dedicated local verification; the room uses its normal bot policy, pacing and deadlines.
process.env.NODE_ENV = "test";
const { values } = parseArgs({
  options: {
    checkpoint: { type: "string" },
    output: { type: "string" },
    python: { type: "string", default: "python3" },
    games: { type: "string", default: "26" },
    seed: { type: "string", default: "6025000" },
    "match-timeout-ms": { type: "string", default: "600000" },
  },
});
if (!values.checkpoint || !values.output) throw new Error("--checkpoint and --output are required");
const games = Number(values.games);
const seed = Number(values.seed);
const matchTimeoutMs = Number(values["match-timeout-ms"]);
if (
  ![games, matchTimeoutMs].every((value) => Number.isSafeInteger(value) && value > 0) ||
  !Number.isSafeInteger(seed) ||
  seed < 0
) {
  throw new Error("Invalid room verification limits");
}
const output = resolve(values.output);
if (existsSync(output)) throw new Error("Use a new output directory");
mkdirSync(output, { recursive: true });
const apiRequire = createRequire(resolve("apps/api/package.json"));
const shared = await import(pathToFileURL(apiRequire.resolve("@aegis/shared")).href);
const { matchMaker, LocalDriver, LocalPresence } = await import(pathToFileURL(apiRequire.resolve("colyseus")).href);
const fromApi = (file) => import(pathToFileURL(resolve("apps/api/dist", file)).href);
await fromApi("cards/index.js");
const { AegisRoom } = await fromApi("rooms/AegisRoom.js");
const { BotPlayer } = await fromApi("bot/BotPlayer.js");
const { InferenceClient } = await fromApi("bot/training/inferenceClient.js");
const { startBotInference, stopBotInference } = await fromApi("bot/inferenceRuntime.js");
const { trainingDeck, TRAINING_DECK_VERSIONS } = await fromApi("bot/training/decks.js");
const { trainingMetadata } = await fromApi("bot/training/metadata.js");
const { mainActionReady } = await fromApi("bot/training/actions.js");
const results = [];
const presence = new LocalPresence();
const driver = new LocalDriver();
let matchMakerStarted = false;
let active;
const choose = InferenceClient.prototype.choose;
InferenceClient.prototype.choose = async function (window, signal) {
  const metrics = active;
  metrics.modelQueries++;
  const started = performance.now();
  const index = await choose.call(this, window, signal);
  metrics.successfulQueries++;
  metrics.latenciesMs.push(performance.now() - started);
  const action = window.actions[index];
  const intent = action.intent;
  const family = intent.digiXros
    ? "mainDigiXros"
    : intent.effectKey?.startsWith("blast-dna-digivolve:")
      ? "blastDnaCounter"
      : intent.effectKey?.startsWith("blast-digivolve:")
        ? "blastCounter"
        : intent.type;
  metrics.selectedActions[family] = (metrics.selectedActions[family] ?? 0) + 1;
  return index;
};

async function disposeRoom(room) {
  if (room === undefined) return;
  // The scripted client has no socket; release it before framework disposal.
  room.clients.splice(0);
  await room.disconnect();
  if (matchMaker.getLocalRoomById(room.roomId)) throw new Error("Disposed room remains registered");
}

async function runRoom(index) {
  const botVersion = TRAINING_DECK_VERSIONS[index % TRAINING_DECK_VERSIONS.length];
  const humanVersion = TRAINING_DECK_VERSIONS[(index + 1) % TRAINING_DECK_VERSIONS.length];
  const metrics = { modelQueries: 0, successfulQueries: 0, latenciesMs: [], selectedActions: {} };
  active = metrics;
  let room;
  let humanDriver;
  let deadline;
  let progress;
  let gameOver;
  let error;
  let initialStateBytes;
  const rejections = [];
  const intentRejections = [];
  const started = Date.now();
  try {
    const listing = await matchMaker.createRoom("bot-verification", { botRoom: true, seed: seed + index });
    room = matchMaker.getLocalRoomById(listing.roomId);
    let finish;
    const outcome = new Promise((resolveOutcome, rejectOutcome) => {
      finish = resolveOutcome;
      deadline = setTimeout(
        () => rejectOutcome(new Error("Room verification exceeded its match deadline")),
        matchTimeoutMs,
      );
    });
    room.broadcast = (channel, event) => {
      if (channel === shared.EVENT_CHANNEL) {
        if (event.kind === "actionRejected") rejections.push(event);
        humanDriver?.onEvent(event);
        if (event.kind === "gameOver") finish(event);
      }
      return true;
    };
    const applyIntent = room.engine.applyIntent;
    room.engine.applyIntent = function (seat, intent) {
      const result = applyIntent.call(this, seat, intent);
      if (!result.ok) intentRejections.push({ seat, intent, result });
      return result;
    };
    initialStateBytes = room.getInspectorView().stateSize;
    const human = {
      sessionId: `room-verification-${index}`,
      send(channel, message) {
        if (channel === shared.DECISION_CHANNEL) humanDriver?.onDecisionRequested(message);
        if (channel === shared.EVENT_CHANNEL && message.kind === "actionRejected") rejections.push(message);
      },
    };
    room.clients.push(human);
    room.onJoin(human, { displayName: "Verification opponent", deck: trainingDeck(humanVersion).deck });
    humanDriver = new BotPlayer(0, room.state, (intent) => room.handleIntent(human, intent), {
      thinkDelay: () => new Promise((continueTurn) => setImmediate(continueTurn)),
      canChooseMainAction: () => mainActionReady(room.engine),
      canChooseBreedingAction: () => room.engine.breeding.isOpen && !room.engine.breeding.isActionSpent,
    });
    const settled = room.engine.hooks.onActionSettled;
    room.engine.hooks.onActionSettled = (seat, intent) => {
      settled?.(seat, intent);
      if (seat === 0) humanDriver.onActionSettled(intent);
    };
    const preset = shared.ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === botVersion);
    if (!room.addBot(preset.deckId)) throw new Error("Room refused bot seating");
    if (room.state.players[1].displayName !== "BT26 AI") throw new Error("Room did not select checkpoint policy");
    progress = setInterval(
      () =>
        process.stdout.write(
          JSON.stringify({
            progress: true,
            index,
            botVersion,
            turn: room.state.turnCount,
            phase: room.state.phase,
            modelQueries: metrics.modelQueries,
          }) + "\n",
        ),
      15000,
    );
    gameOver = await outcome;
    const completedListing = await matchMaker.getRoomById(room.roomId);
    if (!room.locked || completedListing?.locked !== true) throw new Error("Finished room was not locked");
    const fallback = room.bots[1].inferenceFallbacks;
    if (
      !metrics.successfulQueries ||
      rejections.length ||
      intentRejections.length ||
      fallback.error ||
      fallback.timeout
    ) {
      throw new Error("Room verification failed inference checks");
    }
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  } finally {
    clearTimeout(deadline);
    clearInterval(progress);
    humanDriver?.dispose();
    const record = {
      index,
      seed: seed + index,
      botVersion,
      humanVersion,
      gameOver,
      error,
      initialStateBytes,
      ...metrics,
      rejections,
      intentRejections,
      fallback: room?.bots[1]?.inferenceFallbacks,
      durationMs: Date.now() - started,
      botName: room?.state.players[1]?.displayName,
    };
    try {
      await disposeRoom(room);
    } catch (failure) {
      record.cleanupError = failure instanceof Error ? failure.message : String(failure);
      error ??= record.cleanupError;
      record.error = error;
    } finally {
      room?.clock.stop();
      active = undefined;
    }
    results.push(record);
    writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
    process.stdout.write(JSON.stringify({ ...record, latenciesMs: undefined }) + "\n");
  }
  if (error) throw new Error(error);
}

try {
  await matchMaker.setup(presence, driver);
  matchMakerStarted = true;
  await matchMaker.accept(true);
  matchMaker.defineRoomType("bot-verification", AegisRoom);
  await startBotInference({ AEGIS_BOT_CHECKPOINT: resolve(values.checkpoint), AEGIS_BOT_PYTHON: values.python });
  writeFileSync(
    join(output, "config.json"),
    JSON.stringify(
      {
        games,
        seed,
        matchTimeoutMs,
        checkpoint: resolve(values.checkpoint),
        checkpointSha256: createHash("sha256")
          .update(readFileSync(resolve(values.checkpoint)))
          .digest("hex"),
        metadata: trainingMetadata(),
        botSeat: 1,
        botPacing: "normal",
        policyTimeoutMs: 1000,
        transport: "local Colyseus matchmaker with in-process scripted human intents",
      },
      null,
      2,
    ),
  );
  for (let index = 0; index < games; index++) await runRoom(index);
} finally {
  InferenceClient.prototype.choose = choose;
  try {
    await stopBotInference();
  } finally {
    if (matchMakerStarted) await matchMaker.gracefullyShutdown();
    await presence.shutdown();
    await driver.shutdown();
  }
}
