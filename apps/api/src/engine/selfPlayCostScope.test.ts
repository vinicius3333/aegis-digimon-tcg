import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import { mainActions } from "../bot/training/actions.js";
import "../cards/index.js";

describe("self play-cost effects cannot reduce another card's play", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((affordable) => [false, true].map((breeding) => ({ seat, affordable, breeding }))),
    ),
  )(
    "seat=$seat affordable=$affordable breeding=$breeding ignores resident Ghoulmon",
    async ({ seat, affordable, breeding }) => {
      const setup = setupEngine(
        {
          [seat]: {
            ...(breeding ? { breeding: { card: "BT25-076", as: "resident" } } : {}),
            hand: [{ card: affordable ? "EX9-046" : "BT9-112", as: "played" }],
            battleArea: [
              ...(!breeding ? [{ card: "BT25-076", as: "resident" }] : []),
              { card: "EX9-054", as: "payment", under: [{ card: "EX9-005", as: "egg" }] },
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
      ).toBe(affordable);
      expect(setup.state.toJSON()).toEqual(before);
      expect(setup.engine.applyIntent(seat, intent)).toEqual(
        affordable ? { ok: true } : { ok: false, reason: "insufficient-memory" },
      );
      await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
      expect(setup.decisions.filter(({ req }) => req.sourceCardId === "BT25-076")).toEqual([]);
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        ...(!breeding ? [setup.inst("resident").instanceId] : []),
        setup.inst("payment").instanceId,
        ...(affordable ? [intent.instanceId] : []),
      ]);
      expect(setup.state.players[seat]!.breeding?.topCard.instanceId).toBe(
        breeding ? setup.inst("resident").instanceId : undefined,
      );
      expect(setup.perm("payment").stack.map((card) => card.instanceId)).toEqual([setup.inst("egg").instanceId]);
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.memory).toBe(affordable ? -3 : 0);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
  it.each([0, 1] as const)("seat=%s preserves Parasaurmon's cross-card reduction", async (seat) => {
    const setup = setupEngine(
      {
        [seat]: {
          hand: [{ card: "BT2-049", as: "played" }],
          battleArea: [{ card: "EX3-040", as: "watcher" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.turnSeat = seat;
    setup.state.memory = 0;
    await setup.ready();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, seat).map((action) => action.intent)).toContainEqual(intent);
    expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: true });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("watcher").instanceId,
      intent.instanceId,
    ]);
    expect(setup.perm("watcher").isSuspended).toBe(true);
    expect(setup.events).toContainEqual({ kind: "memoryChanged", from: 0, to: -10, reason: "playCard" });
    expect(setup.decisions.some(({ req }) => req.sourceCardId === "EX3-040")).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });
});
