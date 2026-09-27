import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActions, mainActionReady } from "./actions.js";
import { createTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

async function expectActionCompleted(setup: ReturnType<typeof setupEngine>): Promise<void> {
  await settle(() => mainActionReady(setup.engine));
  expect(mainActionReady(setup.engine)).toBe(true);
  expect(setup.state.pendingDecision).toBeUndefined();
  expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
}

describe("scoped Option actions through the training adapter", () => {
  it("uses Garnet Memory Boost, chooses a nonfirst revealed card and orders the remainder", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: ["EX9-046"],
          hand: [{ card: "LM-033", as: "option" }],
          deck: ["EX9-046", { card: "EX9-048", as: "pick" }, "BT25-032"],
        },
      },
      { autoOrderTriggers: false, autoOrderCards: false },
    );
    setup.state.memory = 3;
    await setup.ready();
    const selectedId = setup.inst("pick").instanceId;
    const windows: TrainingWindow[] = [];
    const policy = createTrainingPolicy(setup.engine, 0, (window) => {
      windows.push(window);
      if (window.kind === "main") return window.actions.findIndex(({ intent }) => intent.type === "playCard");
      if (window.kind === "orderCards") return window.actions.length - 1;
      if (window.kind === "selectCards" || window.kind === "chooseTargets") {
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex((action) => action.sourceId === selectedId);
      }
      return 0;
    });
    expect(setup.engine.applyIntent(0, policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({ ok: true });
    const placed = () => setup.state.players[0]!.battleArea.some((unit) => unit.topCard.cardId === "LM-033");
    for (let step = 0; !placed() && step < 20; step++) {
      await settle(() => placed() || setup.state.pendingDecision !== undefined);
      if (placed()) break;
      const pending = setup.state.pendingDecision!;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(setup.engine.applyIntent(0, policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual({
        ok: true,
      });
      await settle();
    }
    expect(placed()).toBe(true);
    expect(setup.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-048"]);
    expect(setup.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-032", "EX9-046"]);
    expect(windows.some((window) => window.kind === "selectCards")).toBe(true);
    expect(windows.some((window) => window.kind === "orderCards")).toBe(true);
    expect(setup.state.memory).toBe(0);
    await expectActionCompleted(setup);
    expect(
      mainActions(setup.engine, 0).some(
        ({ intent }) => intent.type === "activateEffect" && intent.sourceInstanceId === setup.inst("option").instanceId,
      ),
    ).toBe(false);
  });

  it("offers an established Delay activation, pays by trashing the Option, and gains memory", async () => {
    const setup = setupEngine({ 0: { battleArea: [{ card: "LM-033", as: "option" }] } });
    setup.state.memory = 0;
    await setup.ready();
    const policy = createTrainingPolicy(setup.engine, 0, (window) =>
      window.actions.findIndex(({ intent }) => intent.type === "activateEffect"),
    );
    expect(setup.engine.applyIntent(0, policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({ ok: true });
    await settle(() => setup.state.memory === 2);
    await expectActionCompleted(setup);
    expect(setup.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["LM-033"]);
    expect(setup.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("respects the Treadmill Training color waiver and its existing-copy restriction", async () => {
    const setup = setupEngine({ 0: { hand: [{ card: "LM-054", as: "option" }] } });
    setup.state.memory = 3;
    await setup.ready();
    const offered = () =>
      mainActions(setup.engine, 0).some(
        ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("option").instanceId,
      );
    expect(offered()).toBe(true);
    setup.putOnBoard(0, { card: "LM-054" });
    await setup.engine.recomputeContinuousEffects();
    expect(offered()).toBe(false);
  });
});
