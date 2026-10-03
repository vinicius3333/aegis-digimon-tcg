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
  it.each([0, 1])("preserves full DigiXros after a rejected %s-material declaration", async (count) => {
    const s = setupEngine({ 0: { hand: [{ card: "BT19-063", as: "result" }, "EX10-026", "EX10-027"] } });
    s.state.memory = 10;
    await s.ready();
    let nextCount = count;
    const policy = createTrainingPolicy(s.engine, 0, (window) =>
      window.actions.findIndex(
        ({ intent }) =>
          intent.type === "playCard" &&
          intent.instanceId === s.inst("result").instanceId &&
          (intent.digiXros?.materialInstanceIds.length ?? 0) === nextCount,
      ),
    );
    const original = policy.chooseMainAction(buildBotView(s.state, 0)!);
    expect(original.type).toBe("playCard");
    policy.onEngineRejection!(memoryRejection);
    nextCount = 2;
    const alternate = policy.chooseMainAction(buildBotView(s.state, 0)!);
    expect(alternate).toMatchObject({
      type: "playCard",
      instanceId: s.inst("result").instanceId,
      digiXros: {
        materialInstanceIds: [s.state.players[0]!.hand[1]!.instanceId, s.state.players[0]!.hand[2]!.instanceId],
      },
    });
    expect(policy.recoveredPlayRejections()).toBe(1);
  });
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
