import { ArraySchema } from "@colyseus/schema";
import { EffectTiming, GameState, PlayerState } from "@aegis/shared";
import { DecisionManager, type DecisionExecutionFrame } from "../../engine/decisions/index.js";
import { createResolverDecisions } from "../../engine/decisions/resolverDecisions.js";
import type { CollectedEffect } from "../../engine/effects/collect.js";

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === "origin") {
    const { manager } = createManager();
    const resolver = createResolverDecisions(manager);
    const choice = resolver.chooseOrder(
      0,
      [
        collectedEffect("trigger-permanent-a", "BT1-010/on-play"),
        collectedEffect("trigger-permanent-b", "BT1-011/on-play"),
      ],
      EffectTiming.OnPlay,
    );
    await waitForDecision(manager);

    const frame = JSON.parse(JSON.stringify(manager.exportExecutionFrame())) as ReturnType<
      typeof manager.exportExecutionFrame
    >;
    const decisionId = frame.request.decisionId;
    const selectedKey = frame.validation.triggerKeys?.[1];
    if (selectedKey === undefined) throw new Error("origin frame omitted the second trigger identity");
    if (!manager.respond(0, decisionId, { kind: "orderTriggers", order: [selectedKey] })) {
      throw new Error("origin rejected the valid trigger-order response");
    }

    writeResult({
      pid: process.pid,
      frame,
      selectedIndex: await choice,
      continuation: manager.takeResumedExecutionFrameResult(decisionId),
      selectedKey,
    });
    return;
  }

  if (mode === "destination") {
    const frame = JSON.parse(await readStdin()) as DecisionExecutionFrame;
    const { manager, state } = createManager();
    createResolverDecisions(manager);
    manager.restoreExecutionFrame(frame);
    const decisionId = frame.request.decisionId;
    const selectedKey = frame.validation.triggerKeys?.[1];
    if (selectedKey === undefined) throw new Error("destination frame omitted the second trigger identity");
    if (!manager.respond(0, decisionId, { kind: "orderTriggers", order: [selectedKey] })) {
      throw new Error("destination rejected the valid trigger-order response");
    }
    writeResult({
      pid: process.pid,
      pendingDecisionCleared: state.pendingDecision === undefined,
      continuation: manager.takeResumedExecutionFrameResult(decisionId),
      selectedKey,
    });
    return;
  }

  throw new Error(`unknown decision worker mode: ${String(mode)}`);
}

function createManager(): { manager: DecisionManager; state: GameState } {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return {
    manager: new DecisionManager(state, { requestDecision: () => {} }, { executionFramesEnabled: true }),
    state,
  };
}

function collectedEffect(instanceId: string, effectKey: string): CollectedEffect {
  return {
    source: { cardId: "BT1-010", instanceId } as CollectedEffect["source"],
    effect: {
      effectKey,
      description: effectKey,
      optional: false,
      isInherited: false,
      isSecurity: false,
      isLinked: false,
      maxPerTurn: -1,
    } as CollectedEffect["effect"],
    timing: EffectTiming.OnPlay,
  };
}

async function waitForDecision(manager: DecisionManager): Promise<void> {
  for (let attempt = 0; attempt < 20 && !manager.hasPending; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!manager.hasPending) throw new Error("resolver did not open the expected trigger-order decision");
}

function writeResult(value: Record<string, unknown>): void {
  process.stdout.write(`HANDOFF_DECISION_RESULT:${JSON.stringify(value)}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
