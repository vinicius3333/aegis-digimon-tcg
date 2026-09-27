import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { mainActions } from "./actions.js";
import "../../cards/index.js";

describe("training play affordability", () => {
  it.each([false, true])("excludes a sacrifice play without an eligible stack (board present=%s)", async (present) => {
    const setup = setupEngine({
      0: {
        hand: [{ card: "BT25-076", as: "played" }],
        battleArea: present ? [{ card: "EX9-048", as: "ineligible" }] : [],
      },
    });
    setup.state.memory = 0;
    await setup.ready();
    const before = setup.state.toJSON();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).not.toContainEqual(intent);
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(setup.decisions).toEqual([]);
  });

  it("preserves a self reducer combined with a passive pay-time subscription", async () => {
    const setup = setupEngine(
      {
        0: { hand: [{ card: "BT9-112", as: "played" }] },
        1: { battleArea: ["BT6-090", "BT6-090", "BT6-090"] },
      },
      { autoDeclineOptional: true },
    );
    setup.state.memory = 0;
    await setup.ready();
    const key = "affordability/passive";
    setup.engine.subTriggers.subscribeReplacement({
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 1,
      description: "one-shot passive play reduction",
      oncePerTurnKey: key,
      consumeOnActivate: true,
      appliesTo: (target) => target.controllerSeat === 0,
    });
    const before = setup.state.toJSON();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual(intent);
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual(intent);
    expect(setup.engine.tracker.count(key, "replacement")).toBe(0);
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.events).toContainEqual({ kind: "memoryChanged", from: 0, to: -10, reason: "playCard" });
    expect(setup.engine.tracker.count(key, "replacement")).toBe(1);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });

  it.each([3, 4])("checks DeathXmon's automatic reduction with %i opposing Tamers", async (count) => {
    const setup = setupEngine({
      0: { hand: [{ card: "BT9-112", as: "played" }] },
      1: { battleArea: Array.from({ length: count }, () => "BT6-090") },
    });
    setup.state.memory = 0;
    await setup.ready();
    const before = setup.state.toJSON();
    const actions = mainActions(setup.engine, 0);
    expect(
      actions.some(
        (action) => action.intent.type === "playCard" && action.sourceId === setup.inst("played").instanceId,
      ),
    ).toBe(count === 4);
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.decisions).toEqual([]);
  });

  it("preserves a sacrifice route handled by an interactive BeforePayCost effect", async () => {
    const setup = setupEngine({
      0: {
        hand: [{ card: "BT25-076", as: "played" }],
        battleArea: [{ card: "EX9-047", under: ["EX9-005"] }],
      },
    });
    setup.state.memory = 0;
    await setup.ready();
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual({
      type: "playCard",
      instanceId: setup.inst("played").instanceId,
    });
    expect(setup.state.pendingDecision).toBeUndefined();
  });

  it.each([0, 1])("excludes an eleven-cost play with only %i suspension payers", async (count) => {
    const setup = setupEngine({
      0: {
        hand: [{ card: "EX8-074", as: "played" }],
        battleArea: Array.from({ length: count }, () => "EX9-047"),
        breeding: { card: "EX9-005" },
      },
      1: { battleArea: [{ card: "EX9-048", suspended: true }] },
    });
    setup.state.memory = 0;
    await setup.ready();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).not.toContainEqual(intent);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(setup.state.pendingDecision).toBeUndefined();
  });

  it("preserves and pays the two-Digimon suspension route", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-074", as: "played" }],
          battleArea: [
            { card: "EX9-047", as: "own" },
            { card: "EX9-048", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 0;
    await setup.ready();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual(intent);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.state.players[0]!.battleArea.some((unit) => unit.topCard.instanceId === intent.instanceId)).toBe(true);
    expect(setup.perm("own").isSuspended).toBe(true);
    expect(setup.perm("second").isSuspended).toBe(true);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });
});
