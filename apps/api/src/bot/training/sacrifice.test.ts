import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActions } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("sacrifice play payments through the asynchronous policy", () => {
  it.each([-1, 0, 1])("pays with target %i, or declines when full cost is affordable", async (targetIndex) => {
    const setup = setupEngine({
      0: {
        hand: [{ card: "BT25-076", as: "played" }],
        battleArea: [
          { card: "EX9-047", as: "target-0", under: ["EX9-005"] },
          { card: "EX9-048", as: "target-1", under: ["EX9-005"] },
          { card: "EX9-048", as: "ineligible" },
        ],
      },
    });
    const initialMemory = targetIndex < 0 ? 2 : 0;
    setup.state.memory = initialMemory;
    await setup.ready();
    const targets = [0, 1].map((index) => setup.perm(`target-${index}`).permanentId);
    const paymentCards = [0, 1].map((index) => {
      const unit = setup.perm(`target-${index}`);
      return [unit.topCard, ...unit.stack].map((card) => card.instanceId);
    });
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
      await Promise.resolve();
      if (window.kind === "optional") return window.request?.sourceCardId === "BT25-076" && targetIndex >= 0 ? 0 : 1;
      windows.push(window);
      if (window.selected.length > 0 || targetIndex < 0)
        return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex((action) => action.sourceId === targets[targetIndex]);
    });
    const id = setup.inst("played").instanceId;
    const intent = { type: "playCard" as const, instanceId: id };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual(intent);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: true });
    for (let step = 0; step < 16; step++) {
      await settle();
      const pending = setup.state.pendingDecision;
      if (pending === undefined) {
        if (setup.engine.mainVerbContinuationsInFlight === 0) break;
        continue;
      }
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual({
        ok: true,
      });
    }
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(windows[0]!.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]))).toEqual(
      targets,
    );
    expect(
      setup.state.players[0]!.battleArea.map((unit) => unit.permanentId).filter((permanentId) =>
        targets.includes(permanentId),
      ),
    ).toEqual(targets.filter((_, index) => index !== targetIndex));
    expect(setup.state.players[0]!.battleArea.some((unit) => unit.topCard.instanceId === id)).toBe(true);
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(false);
    expect(setup.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      (targetIndex < 0 ? [] : paymentCards[targetIndex]!).toSorted(),
    );
    expect(setup.perm("ineligible").topCard.cardId).toBe("EX9-048");
    const cost = targetIndex < 0 ? 12 : targetIndex === 0 ? 5 : 7;
    expect(setup.events).toContainEqual({
      kind: "memoryChanged",
      from: initialMemory,
      to: initialMemory - cost,
      reason: "playCard",
    });
  });
});
