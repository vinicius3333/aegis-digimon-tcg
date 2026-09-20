import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CardInstance, GameState, PendingDecision, Phase, PlayerState } from "@aegis/shared";
import {
  exportStoppedMainBoundary,
  importStoppedMainBoundary,
  roomHandoffExperimentEnabled,
  ROOM_HANDOFF_EXPERIMENT_ENV,
} from "./experiment.js";

const apiRoot = resolve(process.cwd());
const processWorker = resolve(apiRoot, "dist/rooms/handoff/processWorker.js");
const children = new Set<ReturnType<typeof spawn>>();

afterEach(() => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  children.clear();
});

describe("first room handoff experiment", () => {
  it("keeps the experiment opt-in and always disabled in production", () => {
    expect(roomHandoffExperimentEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(roomHandoffExperimentEnabled({ NODE_ENV: "test", [ROOM_HANDOFF_EXPERIMENT_ENV]: "1" })).toBe(true);
    expect(roomHandoffExperimentEnabled({ NODE_ENV: "production", [ROOM_HANDOFF_EXPERIMENT_ENV]: "1" })).toBe(false);
  });

  it("round-trips server-private zones as schema instances and rejects unsupported boundaries", () => {
    const source = minimalBoundary();
    const snapshot = exportStoppedMainBoundary(source);
    const restored = importStoppedMainBoundary(snapshot);

    expect(restored).not.toBe(source);
    expect(restored.players[0]).toBeInstanceOf(PlayerState);
    expect(restored.players[0]!.deck.map((card) => card.instanceId)).toEqual(["draw-1", "draw-2"]);
    expect(restored.players[0]!.hand[0]!.cardId).toBe("BT1-010");
    expect(restored.players[1]!.security[0]!.cardId).toBe("BT1-013");
    expect(restored.players[1]!.security[0]!.faceUp).toBe(false);

    const pending = minimalBoundary();
    pending.pendingDecision = new PendingDecision();
    expect(() => exportStoppedMainBoundary(pending)).toThrow(/does not support pending decisions/);

    const unsupportedVersion = { ...snapshot, snapshotVersion: 99 };
    expect(() => importStoppedMainBoundary(unsupportedVersion as never)).toThrow(
      /unsupported room handoff snapshot format/,
    );

    const corrupted = { ...snapshot, payload: `${snapshot.payload.slice(0, -4)}AAAA` };
    expect(() => importStoppedMainBoundary(corrupted)).toThrow(/checksum mismatch/);
  });

  it("exports in one process, exits it, then restores, reconnects both client views, and wins in another", async () => {
    const origin = await runWorker("origin");
    expect(origin.code, origin.stderr).toBe(0);
    const originResult = JSON.parse(resultLine(origin.stdout)) as {
      pid: number;
      snapshot: unknown;
      clientState: unknown;
      privateState: unknown;
      game: unknown;
    };

    // runWorker resolves only after `close`: the entire source API process is gone before the
    // receiving process starts, so no in-memory engine, player, or deck can answer its intent.
    const destination = await runWorker("destination", JSON.stringify(originResult.snapshot));
    expect(destination.code, destination.stderr).toBe(0);
    const destinationResult = JSON.parse(resultLine(destination.stdout)) as {
      pid: number;
      clientState: unknown;
      privateState: unknown;
      game: unknown;
    };

    expect(destinationResult.pid).not.toBe(originResult.pid);
    expect(destinationResult.clientState).toEqual(originResult.clientState);
    expect(destinationResult.privateState).toEqual(originResult.privateState);
    expect(destinationResult.game).toEqual(originResult.game);
    expect(destinationResult.game).toMatchObject({ accepted: true, gameOver: true, winnerSeat: 0 });
  });
});

function minimalBoundary(): GameState {
  const state = new GameState();
  state.matchId = "unit-main-boundary";
  state.phase = Phase.Main;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `s${seat}`;
    player.displayName = `Seat ${seat}`;
    state.players[seat] = player;
  }
  state.players[0]!.deck.push(testCard("draw-1", "BT1-011", 0), testCard("draw-2", "BT1-012", 0));
  state.players[0]!.hand.push(testCard("hand-0", "BT1-010", 0));
  state.players[1]!.security.push(testCard("security-1", "BT1-013", 1, false));
  // The process worker covers actual nested zones and engine continuation. This fixture makes
  // the serialization's boundary and corruption guards cheap to inspect in a focused test.
  return state;
}

function testCard(instanceId: string, cardId: string, ownerSeat: 0 | 1, faceUp = true): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.ownerSeat = ownerSeat;
  instance.faceUp = faceUp;
  return instance;
}

function runWorker(mode: "origin" | "destination", input?: string): Promise<WorkerOutput> {
  const child = spawn(process.execPath, [processWorker, mode], {
    cwd: apiRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      [ROOM_HANDOFF_EXPERIMENT_ENV]: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  children.add(child);

  return new Promise((resolveWorker, rejectWorker) => {
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", rejectWorker);
    child.on("close", (code) => {
      children.delete(child);
      resolveWorker({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    child.stdin.end(input);
  });
}

function resultLine(stdout: string): string {
  const line = stdout.split("\n").find((candidate) => candidate.startsWith("HANDOFF_RESULT:"));
  if (line === undefined) throw new Error(`worker did not emit a result line. stdout: ${stdout}`);
  return line.slice("HANDOFF_RESULT:".length);
}

interface WorkerOutput {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}
