import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createTrainingPolicy, type TrainingWindow } from "./policy.js";

describe("training combat context", () => {
  it("preserves target kind and compulsory block while retaining all legal blockers", async () => {
    const setup = setupEngine({});
    await setup.ready();
    const windows: TrainingWindow[] = [];
    const policy = createTrainingPolicy(setup.engine, 0, (window) => {
      windows.push(window);
      return 0;
    });
    const context = {
      attackerPermanentId: "attacker",
      eligibleBlockerIds: ["A", "B"],
      mustBlock: false,
      targetsPlayer: true,
    };
    const view = buildBotView(setup.state, 0)!;
    expect(policy.chooseBlockResponse(view, context)).toEqual({ type: "declineBlock" });
    expect(windows[0]!.combat).toEqual({ targetsPlayer: true, mustBlock: false });
    expect(windows[0]!.actions).toHaveLength(3);
    policy.chooseBlockResponse(view, {
      ...context,
      targetsPlayer: false,
      targetPermanentId: "defender",
      mustBlock: true,
    });
    expect(windows[1]!.combat).toEqual({ targetsPlayer: false, targetPermanentId: "defender", mustBlock: true });
    expect(windows[1]!.actions.map(({ intent }) => intent)).toEqual([
      { type: "declareBlock", blockerPermanentId: "A" },
      { type: "declareBlock", blockerPermanentId: "B" },
    ]);
  });
});
