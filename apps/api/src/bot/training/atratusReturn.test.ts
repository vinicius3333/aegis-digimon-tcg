import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const cases = ([0, 1] as const).flatMap((seat) =>
  [0, 1, 2, 3].flatMap((suspend) => (suspend === 2 ? [2] : [0, 1]).map((returned) => ({ seat, suspend, returned }))),
);

describe("Eclipse Impact's sequential suspension and highest-DP return", () => {
  it.each(cases)("seat=$seat suspend=$suspend return=$returned", async ({ seat, suspend, returned }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [{ card: "BT25-035", as: "friendly", suspended: true }],
        hand: [{ card: "ST23-09", as: "option" }],
      },
      [opponent]: {
        battleArea: [
          ...[9000, 9000, 14000, 6000].map((dp, index) => ({
            card: "EX9-048",
            as: `target-${index}`,
            dp,
            suspended: index < 2,
            under: [{ card: "EX9-005", as: `egg-${index}` }],
          })),
          { card: "BT6-090", as: "tamer", suspended: true },
        ],
        breeding: { card: "EX9-048", as: "breeding", dp: 15000, suspended: true },
        deck: [
          { card: "EX9-046", as: "deck-top" },
          { card: "EX9-047", as: "deck-bottom" },
        ],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const option = setup.inst("option").instanceId;
    const targets = [0, 1, 2, 3].map((index) => setup.perm(`target-${index}`).permanentId);
    const tops = [0, 1, 2, 3].map((index) => setup.inst(`target-${index}`).instanceId);
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === option);
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      windows.push(window);
      return window.actions.findIndex(
        (action) => action.sourceId === targets[windows.length === 1 ? suspend : returned],
      );
    });
    expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
      ok: true,
    });
    for (let step = 0; step < 12; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    await settle(() => mainActionReady(setup.engine));
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(windows.map((window) => window.actions.map((action) => action.sourceId))).toEqual([
      targets,
      ...(suspend === 2 ? [] : [targets.slice(0, 2)]),
    ]);
    expect(setup.state.players[opponent]!.deck.map((card) => card.instanceId)).toEqual([
      setup.inst("deck-top").instanceId,
      setup.inst("deck-bottom").instanceId,
      tops[returned],
    ]);
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
      setup.inst(`egg-${returned}`).instanceId,
    ]);
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([
      ...targets.filter((_, index) => index !== returned),
      setup.perm("tamer").permanentId,
    ]);
    for (const index of [0, 1, 2, 3].filter((candidate) => candidate !== returned)) {
      expect(setup.perm(`target-${index}`).isSuspended).toBe(index < 2 || index === suspend);
      expect(setup.perm(`target-${index}`).stack.map((card) => card.instanceId)).toEqual([
        setup.inst(`egg-${index}`).instanceId,
      ]);
    }
    expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("friendly").instanceId,
    ]);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([option]);
    expect(setup.state.memory).toBe(10 - getCardDefinition("ST23-09")!.playCost);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });
});
