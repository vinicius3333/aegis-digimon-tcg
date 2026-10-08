import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("#5305 same-defect delayed-memory sweep (CR 18-1-2)", () => {
  it.each(["BT1-021", "BT1-040", "BT1-058", "BT1-075"])(
    "%s keeps its ordered loss of 3 even after security battle deletes the source",
    async (cardId) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT24-085", as: "dan" },
              { card: cardId, as: "attacker" },
            ],
            hand: ["BT1-009"],
            deck: Array(8).fill("BT1-009"),
            security: ["BT1-009"],
          },
          1: { security: ["BT26-103"], deck: Array(8).fill("BT1-009") },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();
      let finished = false;
      const turn = s.engine.runOneTurn().then(() => {
        finished = true;
      });
      try {
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(1);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: s.perm("attacker").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId) &&
            s.state.pendingDecision === undefined,
        );
        expect(s.state.memory).toBe(4);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => finished || s.state.pendingDecision?.kind === "orderTriggers");
        expect(s.state.pendingDecision?.kind).toBe("orderTriggers");
        const pending = s.state.pendingDecision!;
        const payload = JSON.parse(pending.payloadJson) as {
          triggerKeys: string[];
          triggerCardIds: string[];
          triggerDescriptions: string[];
        };
        expect(pending.seat).toBe(0);
        const lossIndex = payload.triggerDescriptions.findIndex((description) => description.includes("lose 3 memory"));
        expect(lossIndex).toBeGreaterThanOrEqual(0);
        expect(payload.triggerCardIds[lossIndex]).toBe(cardId);
        expect(payload.triggerCardIds).toContain("BT24-085");
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: pending.decisionId,
            response: { kind: "orderTriggers", order: [payload.triggerKeys[lossIndex]!] },
          }),
        ).toEqual({ ok: true });
        await turn;
        expect(s.state.memory).toBe(-6);
        expect(
          s.events.filter(
            (event) => event.kind === "memoryChanged" && event.to - event.from === -3 && event.reason === "gainMemory",
          ),
        ).toHaveLength(1);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    },
  );

  it("orders two independent Gravity Crush losses around Dan and Kanan and consumes each exactly once", async () => {
    // Two historical copies isolate independent scheduled processing; current deck legality
    // restricts Gravity Crush to one, so this is an engine mechanism fixture, not an arena deck.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-085", as: "dan" }],
          hand: [{ card: "BT1-090", as: "first" }, { card: "BT1-090", as: "second" }, "BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: { deck: Array(8).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(1);
      for (const [alias, memory] of [
        ["first", 3],
        ["second", 5],
      ] as const) {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.memory === memory && s.state.pendingDecision === undefined);
      }
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const pending = s.state.pendingDecision!;
      const payload = JSON.parse(pending.payloadJson) as {
        triggerKeys: string[];
        triggerCardIds: string[];
        triggerDescriptions: string[];
      };
      const losses = payload.triggerDescriptions.flatMap((description, index) =>
        description.includes("lose 2 memory") ? [payload.triggerKeys[index]!] : [],
      );
      expect(losses).toHaveLength(2);
      expect(new Set(losses).size).toBe(2);
      const danKey = payload.triggerKeys[payload.triggerCardIds.indexOf("BT24-085")]!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [losses[0]!, danKey, losses[1]!] },
        }),
      ).toEqual({ ok: true });
      await turn;
      expect(s.state.memory).toBe(-7);
      const memoryLosses = () =>
        s.events.filter(
          (event) => event.kind === "memoryChanged" && event.to - event.from === -2 && event.reason === "gainMemory",
        );
      expect(memoryLosses()).toHaveLength(2);
      expect(
        advance(s.engine)
          .ledgers.subTriggers.subscriptionsFor("endOfTurn")
          .filter((sub) => sub.description?.includes("memory")),
      ).toHaveLength(0);
      // Re-fire the production timing seam: consumed one-shots must not reappear even
      // when the same timing is processed again (the full turn loop is covered by the arena).
      await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
      expect(memoryLosses()).toHaveLength(2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
