import { GameState, Phase, type DecisionRequest, type Seat } from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import { BLUE_DECK, RED_DECK } from "../../engine/testDecks.js";
import { exportPendingMulliganBoundary, importPendingMulliganBoundary } from "./experiment.js";

interface SnapshotInput {
  readonly runtime: ReturnType<GameEngine["exportContinuityState"]>;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === "origin") {
    const runtime = createRuntime();
    runtime.engine.startMatch();
    await waitFor(() => runtime.state.pendingDecision?.kind === "mulligan");
    const firstSeat = runtime.state.pendingDecision!.seat as Seat;
    if (!runtime.engine.applyIntent(firstSeat, { type: "mulligan", keep: false }).ok)
      throw new Error("origin rejected first mulligan response");
    await waitFor(() => runtime.state.pendingDecision?.kind === "mulligan");
    const secondSeat = runtime.state.pendingDecision!.seat as Seat;
    if (secondSeat === firstSeat) throw new Error("mulligan order did not advance to the other seat");

    const boundary = exportPendingMulliganBoundary(runtime.state);
    const continuity = JSON.parse(JSON.stringify(runtime.engine.exportContinuityState())) as SnapshotInput["runtime"];
    if (continuity.mulliganWindow?.decision.request.seat !== secondSeat)
      throw new Error("exported mulligan continuation does not match the open seat");

    if (!runtime.engine.applyIntent(secondSeat, { type: "mulligan", keep: false }).ok)
      throw new Error("origin rejected second mulligan response");
    await waitFor(() => runtime.state.phase === Phase.Breeding);
    writeResult({ pid: process.pid, boundary, runtime: continuity, finalState: runtime.state.toJSON() });
    return;
  }

  if (mode === "destination") {
    const input = JSON.parse(await readStdin()) as {
      boundary: Parameters<typeof importPendingMulliganBoundary>[0];
      runtime: SnapshotInput["runtime"];
    };
    const state = importPendingMulliganBoundary(input.boundary);
    const runtime = createRuntime(state);
    runtime.engine.restoreContinuityState(input.runtime);
    const pending = state.pendingDecision;
    if (!pending || pending.kind !== "mulligan") throw new Error("import lost the open mulligan");

    const continuation = runtime.engine.resumeRestoredMatchSetup();
    const decisionCountBefore = runtime.decisions.length;
    if (!runtime.engine.applyIntent(pending.seat as Seat, { type: "mulligan", keep: false }).ok)
      throw new Error("destination rejected the restored mulligan response");
    await continuation;
    await waitFor(() => state.phase === Phase.Breeding);
    const duplicateAccepted = runtime.engine.applyIntent(pending.seat as Seat, { type: "mulligan", keep: false }).ok;
    writeResult({
      pid: process.pid,
      finalState: state.toJSON(),
      duplicateAccepted,
      decisionCountBefore,
      decisionCountAfter: runtime.decisions.length,
      pendingCleared: state.pendingDecision === undefined,
    });
    return;
  }

  throw new Error(`unknown mulligan worker mode: ${String(mode)}`);
}

function createRuntime(state = new GameState()): {
  engine: GameEngine;
  state: GameState;
  decisions: Array<{ seat: Seat; request: DecisionRequest }>;
} {
  const decisions: Array<{ seat: Seat; request: DecisionRequest }> = [];
  const hooks: GameEngineHooks = {
    seed: 22,
    executionFramesEnabled: true,
    emit: () => undefined,
    requestDecision: (seat, request) => decisions.push({ seat, request }),
  };
  const engine = new GameEngine(state, hooks);
  if (state.players.length === 0) {
    engine.seatPlayer(0, "session-0", { displayName: "Red", deck: { ...RED_DECK } });
    engine.seatPlayer(1, "session-1", { displayName: "Blue", deck: { ...BLUE_DECK } });
  }
  return { engine, state, decisions };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("timed out waiting for match setup state");
}

async function readStdin(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

function writeResult(value: unknown): void {
  process.stdout.write(`MULLIGAN_LIFECYCLE_RESULT:${JSON.stringify(value)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
