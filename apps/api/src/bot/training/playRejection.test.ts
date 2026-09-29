import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createTrainingPolicy, unexplainedRejections, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const memoryRejection = { kind: "actionRejected", intent: "playCard", reason: "insufficient-memory" } as const;

async function setup() {
  const engine = setupEngine({
    0: {
      hand: [
        { card: "BT26-015", as: "played" },
        { card: "BT26-011", as: "other" },
      ],
    },
  });
  engine.state.memory = 10;
  await engine.ready();
  const windows: TrainingWindow[] = [];
  let pick = (window: TrainingWindow) =>
    window.actions.findIndex(
      ({ intent }) => intent.type === "playCard" && intent.instanceId === engine.inst("played").instanceId,
    );
  const policy = createTrainingPolicy(engine.engine, 0, (window) => {
    windows.push(window);
    return pick(window);
  });
  const choose = () => policy.chooseMainAction(buildBotView(engine.state, 0)!);
  const playable = () =>
    windows
      .at(-1)!
      .actions.filter(({ intent }) => intent.type === "playCard")
      .map(({ sourceId }) => sourceId);
  return {
    engine,
    policy,
    choose,
    playable,
    endPhase: () => {
      pick = (window) => window.actions.findIndex(({ intent }) => intent.type === "endPhase");
    },
  };
}

describe("deferred play rejections in the training policy", () => {
  it("excludes the rejected play until memory changes", async () => {
    const { engine, policy, choose, playable, endPhase } = await setup();
    const played = engine.inst("played").instanceId;
    const other = engine.inst("other").instanceId;
    expect(choose()).toEqual({ type: "playCard", instanceId: played });
    policy.onEngineRejection!(memoryRejection);
    expect(policy.recoveredPlayRejections()).toBe(1);
    endPhase();
    choose();
    expect(playable()).toEqual([other]);
    engine.state.memory = 9;
    choose();
    expect(playable()).toEqual([played, other]);
  });

  it("does not recover other rejections or a play that already left the hand", async () => {
    const { engine, policy, choose } = await setup();
    choose();
    policy.onEngineRejection!({ ...memoryRejection, reason: "no-empty-slot" });
    engine.state.turnSeat = 1;
    policy.onEngineRejection!(memoryRejection);
    engine.state.turnSeat = 0;
    engine.state.players[0]!.hand.splice(0, 1);
    policy.onEngineRejection!(memoryRejection);
    expect(policy.recoveredPlayRejections()).toBe(0);
  });

  it("reports only rejections the policy did not recover", () => {
    const other: ServerEvent = { kind: "actionRejected", intent: "attack", reason: "invalid-target" };
    expect(unexplainedRejections([memoryRejection, other, memoryRejection], 1)).toEqual([other, memoryRejection]);
    expect(unexplainedRejections([other], 0)).toEqual([other]);
  });
});
