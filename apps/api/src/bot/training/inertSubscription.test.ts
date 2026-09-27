import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { mainActions } from "./actions.js";
import "../../cards/index.js";

describe("unrelated subscriptions beside an unavailable self reduction", () => {
  it.each(([0, 1] as const).flatMap((seat) => [1, 2].map((payers) => ({ seat, payers }))))(
    "seat=$seat payers=$payers checks a suspension payment beside a subscription",
    async ({ seat, payers }) => {
      const setup = setupEngine(
        {
          [seat]: {
            hand: [{ card: "EX8-074", as: "played" }],
            battleArea: [
              { card: "EX8-074", as: "resident" },
              ...(payers === 2 ? [{ card: "EX9-046", as: "second" }] : []),
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      setup.state.turnSeat = seat;
      setup.state.memory = 0;
      await setup.ready();
      const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
      const before = setup.state.toJSON();
      expect(
        mainActions(setup.engine, seat).some(
          (action) => action.intent.type === "playCard" && action.sourceId === intent.instanceId,
        ),
      ).toBe(payers === 2);
      expect(setup.state.toJSON()).toEqual(before);
      expect(setup.engine.applyIntent(seat, intent)).toEqual(
        payers === 2 ? { ok: true } : { ok: false, reason: "insufficient-memory" },
      );
      await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
      expect(setup.state.players[seat]!.battleArea.some((unit) => unit.topCard.instanceId === intent.instanceId)).toBe(
        payers === 2,
      );
      expect(
        setup.state.players[seat]!.battleArea.filter((unit) => unit.topCard.instanceId !== intent.instanceId).map(
          (unit) => unit.isSuspended,
        ),
      ).toEqual(Array.from({ length: payers }, () => payers === 2));
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
        payers === 2 ? [] : [intent.instanceId],
      );
      expect(setup.events.filter((event) => event.kind === "memoryChanged" && event.reason === "playCard")).toEqual(
        payers === 2 ? [{ kind: "memoryChanged", from: 0, to: -7, reason: "playCard" }] : [],
      );
      expect(setup.state.memory).toBe(payers === 2 ? -7 : 0);
      expect(setup.decisions.length === 0).toBe(payers === 1);
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.state.pendingDecision).toBeUndefined();
    },
  );
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["BT25-020", "BT25-076"].flatMap((card) => [false, true].map((resident) => ({ seat, card, resident }))),
    ),
  )("seat=$seat card=$card resident=$resident excludes the unaffordable play", async ({ seat, card, resident }) => {
    const setup = setupEngine({
      [seat]: {
        hand: [{ card, as: "played" }],
        battleArea: resident ? [{ card: "EX8-074" }] : [],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 1;
    await setup.ready();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    const before = setup.state.toJSON();
    expect(mainActions(setup.engine, seat).map((action) => action.intent)).not.toContainEqual(intent);
    expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.decisions).toEqual([]);
  });
  it.each(([0, 1] as const).flatMap((seat) => ["BT25-020", "BT25-076"].map((card) => ({ seat, card }))))(
    "seat=$seat card=$card preserves a payable own reduction",
    async ({ seat, card }) => {
      const setup = setupEngine(
        {
          [seat]: {
            hand: [{ card, as: "played" }],
            battleArea: [
              { card: "EX8-074", as: "resident" },
              ...(card === "BT25-076" ? [{ card: "EX9-046", as: "payment", under: ["EX9-005"] }] : []),
            ],
          },
          [seat === 0 ? 1 : 0]: { battleArea: [{ card: "BT9-112" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      setup.state.turnSeat = seat;
      setup.state.memory = 1;
      await setup.ready();
      const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
      const before = setup.state.toJSON();
      expect(mainActions(setup.engine, seat).map((action) => action.intent)).toContainEqual(intent);
      expect(setup.state.toJSON()).toEqual(before);
      expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: true });
      await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
      expect(setup.state.players[seat]!.battleArea.some((unit) => unit.topCard.instanceId === intent.instanceId)).toBe(
        true,
      );
      expect(setup.events).toContainEqual({
        kind: "memoryChanged",
        from: 1,
        to: card === "BT25-020" ? -6 : -8,
        reason: "playCard",
      });
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([0, 1] as const)("seat=%s preserves a subscription enabled by paying a sacrifice cost", async (seat) => {
    const setup = setupEngine(
      {
        [seat]: {
          hand: [{ card: "BT25-076", as: "played" }],
          battleArea: [{ card: "EX9-046", as: "payment", under: ["EX9-005"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.turnSeat = seat;
    setup.state.memory = 0;
    await setup.ready();
    const key = "affordability/after-sacrifice";
    setup.engine.subTriggers.subscribeReplacement({
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 1,
      description: "discount enabled by sacrifice payment",
      oncePerTurnKey: key,
      appliesTo: (target) =>
        target.controllerSeat === seat &&
        !setup.state.players[seat]!.battleArea.some(
          (unit) => unit.topCard.instanceId === setup.inst("payment").instanceId,
        ),
    });
    const before = setup.state.toJSON();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, seat).map((action) => action.intent)).toContainEqual(intent);
    expect(setup.engine.tracker.count(key, "replacement")).toBe(0);
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: true });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.state.players[seat]!.trash.some((card) => card.instanceId === setup.inst("payment").instanceId)).toBe(
      true,
    );
    expect(setup.engine.tracker.count(key, "replacement")).toBe(1);
    expect(setup.events).toContainEqual({ kind: "memoryChanged", from: 0, to: -8, reason: "playCard" });
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(setup.state.pendingDecision).toBeUndefined();
  });
});
