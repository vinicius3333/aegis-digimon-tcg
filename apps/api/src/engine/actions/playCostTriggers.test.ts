import { describe, expect, it } from "vitest";
import { Zone, type Seat } from "@aegis/shared";
import { compiled as originalAgumon } from "../../cards/BT1/BT1-010.js";
import { compiled as queen } from "../../cards/BT26/BT26-098.js";
import { registerIrCard } from "../effects/interpreter.js";
import { applyPlayCard } from "./playCard.js";
import { playCardDeps } from "../gameEngine/actionDeps.js";
import { extractCardAt, insertCard } from "../state/access.js";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

describe("play/use cost-trigger timing", () => {
  for (const seat of [0, 1] as const) {
    for (const extraPlay of [false, true]) {
      it(`extraPlay=${extraPlay}: does not let Rosemon reuse the Queen of Thorns being paid for by seat ${seat}`, async () => {
        const opponent: Seat = seat === 0 ? 1 : 0;
        const s = setupEngine(
          {
            [seat]: {
              hand: [
                { card: "BT26-098", as: "queen" },
                ...(extraPlay ? [{ card: "BT26-039", as: "freeSunflowmon" }] : []),
              ],
              battleArea: [
                { card: "BT26-049", as: "rosemon" },
                {
                  card: "BT26-091",
                  as: "yoshino",
                  under: [{ card: "BT26-039", as: "payment", faceUp: false }],
                },
              ],
              deck: ["BT1-001", "BT1-002"],
            },
            [opponent]: {
              battleArea: [
                { card: "BT1-085", suspended: true },
                { card: "BT1-085", suspended: true },
              ],
              deck: ["BT1-001", "BT1-002"],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 5;
        await s.ready();

        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
        expect(s.engine.mainVerbContinuationsInFlight).toBe(0);
        expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
        expect(s.state.players[seat]!.hand).toHaveLength(0);
        expect(s.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([
          s.inst("payment").instanceId,
          s.inst("queen").instanceId,
        ]);
        expect(s.events.filter((event) => event.kind === "cardPlayed" && event.cardId === "BT26-098")).toHaveLength(1);
        expect(s.state.memory).toBe(2);
        expect(
          s.state.players[seat]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT26-039"),
        ).toHaveLength(extraPlay ? 1 : 0);
        const freePlay = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT26-039");
        const optionTrashed = s.events.findIndex(
          (event) =>
            event.kind === "cardsMoved" &&
            event.to === Zone.Trash &&
            event.instanceIds.includes(s.inst("queen").instanceId),
        );
        expect(optionTrashed).toBeGreaterThan(-1);
        expect(freePlay > optionTrashed).toBe(extraPlay);
        expect(s.engine.playCostSubTriggers).toBeUndefined();
      });
    }
  }

  it.each([false, true])(
    "orders payment reactions with On Play and drops a departed anchor (deleteRosemon=%s)",
    async (deleteRosemon) => {
      // Test-only IR isolates a payment event shared with a permanent's own entry window.
      registerIrCard("BT1-010", {
        effects: [
          queen.effects[0]!,
          {
            trigger: "OnPlay",
            actions: deleteRosemon
              ? [{ kind: "Delete", target: { filter: { controller: "mine", cardId: "BT26-049" }, count: 1 } }]
              : [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
        coverage: "full",
        residual: [],
      });
      try {
        const s = setupEngine(
          {
            0: {
              hand: [
                { card: "BT1-010", as: "paid" },
                { card: "BT26-039", as: "freeSunflowmon" },
              ],
              battleArea: [
                { card: "BT26-049", as: "rosemon" },
                { card: "BT26-091", as: "yoshino", under: [{ card: "BT26-039", as: "payment", faceUp: false }] },
              ],
              deck: ["BT1-009", "BT1-016"],
            },
            1: {
              battleArea: [
                { card: "BT1-085", suspended: true },
                { card: "BT1-085", suspended: true },
              ],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT1-010"] },
        );
        s.state.memory = 5;
        await s.ready();
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paid").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
        expect(s.engine.mainVerbContinuationsInFlight).toBe(0);
        expect(
          s.decisions.some(
            ({ req }) =>
              req.kind === "orderTriggers" &&
              req.options?.triggerCardIds?.includes("BT1-010") &&
              req.options.triggerCardIds.includes("BT26-049"),
          ),
        ).toBe(true);
        const freePlays = s.events.filter((event) => event.kind === "cardPlayed" && event.cardId === "BT26-039");
        expect(freePlays).toHaveLength(deleteRosemon ? 0 : 1);
        expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
        expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-049")).toBe(deleteRosemon);
        expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(!deleteRosemon);
        expect(s.engine.playCostSubTriggers).toBeUndefined();
      } finally {
        registerIrCard("BT1-010", originalAgumon);
      }
    },
  );

  it("restores an enclosing payment frame after a nested play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-098", as: "queen" },
            { card: "BT1-010", as: "nested" },
            { card: "BT26-039", as: "freeSunflowmon" },
          ],
          battleArea: [
            { card: "BT26-049", as: "rosemon" },
            { card: "BT26-091", as: "yoshino", under: [{ card: "BT26-039", as: "payment", faceUp: false }] },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-085", suspended: true },
            { card: "BT1-085", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const deps = playCardDeps(s.engine);
    const finalize = deps.finalizePlayCost!;
    deps.finalizePlayCost = async (...args) => {
      const cost = await finalize(...args);
      const enclosing = s.engine.playCostSubTriggers;
      expect(enclosing?.length).toBeGreaterThan(0);
      const outcome = await applyPlayCard(
        s.state,
        0,
        { type: "playCard", instanceId: s.inst("nested").instanceId },
        playCardDeps(s.engine),
      );
      expect(outcome).toMatchObject({ ok: true });
      expect(s.engine.playCostSubTriggers).toBe(enclosing);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("queen").instanceId)).toBe(true);
      return cost;
    };
    expect(
      await applyPlayCard(s.state, 0, { type: "playCard", instanceId: s.inst("queen").instanceId }, deps),
    ).toMatchObject({ ok: true });
    expect(s.events.filter((event) => event.kind === "cardPlayed").map((event) => event.cardId)).toEqual([
      "BT1-010",
      "BT26-098",
      "BT26-039",
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.engine.playCostSubTriggers).toBeUndefined();
    expect(s.engine.pendingPlayCostDeletionEffects).toEqual([]);
  });

  it.each(["rejected", "thrown"] as const)(
    "settles payment reactions after a %s attempt and clears the next play's queues",
    async (failure) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT26-098", as: "queen" },
              { card: "BT26-039", as: "freeSunflowmon" },
            ],
            battleArea: [
              { card: "BT26-049", as: "rosemon" },
              { card: "BT26-091", as: "yoshino", under: [{ card: "BT26-039", as: "payment", faceUp: false }] },
            ],
            deck: ["BT1-001", "BT1-002"],
          },
          1: {
            battleArea: [
              { card: "BT1-085", suspended: true },
              { card: "BT1-085", suspended: true },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      const deps = playCardDeps(s.engine);
      const finalize = deps.finalizePlayCost!;
      deps.finalizePlayCost = async (...args) => {
        const cost = await finalize(...args);
        // An actual interrupt can move the declared card; exercise the failed procedure boundary.
        const player = s.state.players[0]!;
        const index = player.hand.findIndex((card) => card.instanceId === s.inst("queen").instanceId);
        insertCard(player, Zone.Trash, extractCardAt(player, Zone.Hand, index)!);
        s.engine.pendingPlayReducerPlacements.set(s.inst("queen").instanceId, [s.inst("payment").instanceId]);
        if (failure === "thrown") throw new Error("payment-interrupted");
        return cost;
      };
      const attempt = applyPlayCard(s.state, 0, { type: "playCard", instanceId: s.inst("queen").instanceId }, deps);
      const result = await attempt.catch((error: Error) => ({ error: error.message }));
      expect(result).toEqual(
        failure === "thrown" ? { error: "payment-interrupted" } : { ok: false, reason: "card-not-in-zone" },
      );
      expect(s.state.memory).toBe(5);
      expect(
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("freeSunflowmon").instanceId,
        ),
      ).toBe(true);
      expect(s.engine.playCostSubTriggers).toBeUndefined();
      expect(s.engine.pendingPlayCostDeletionEffects).toEqual([]);
      expect(s.engine.pendingPlayReducerPlacements.size).toBe(0);
      expect(s.engine.pendingSelfReducerRelocations.size).toBe(0);

      const next = s.give(0, Zone.Hand, { card: "BT26-098", as: "nextQueen" });
      const outcome = await applyPlayCard(
        s.state,
        0,
        { type: "playCard", instanceId: next.instanceId },
        playCardDeps(s.engine),
      );
      expect(outcome).toMatchObject({ ok: true, outcome: { cost: 5 } });
      expect(s.state.memory).toBe(0);
      expect(s.events.filter((event) => event.kind === "cardPlayed" && event.cardId === "BT26-039")).toHaveLength(1);
      expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
});
