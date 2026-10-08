import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

// GH5345 has no historical card/match identity. These are contract controls, not
// a reconstruction: CR 16-7 requires deletion in battle while attacking.
describe("#5345 Piercing requires a battle deletion", () => {
  for (const seat of [0, 1] as const) {
    it.each([true, false])(
      `seat ${seat}: Barrier accepted=%s separates payment from a security check`,
      async (accept) => {
        const opponent: Seat = seat === 0 ? 1 : 0;
        const s = setupEngine({
          [seat]: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
          [opponent]: {
            battleArea: [{ card: "BT13-041", as: "defender", suspended: true }],
            security: [
              { card: "BT1-009", as: "top" },
              { card: "BT1-010", as: "safe" },
            ],
          },
        });
        s.state.turnSeat = seat;
        await s.ready();
        const defenderId = s.perm("defender").permanentId;
        expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
        expect(
          s.engine.applyIntent(seat, {
            type: "attack",
            attackerPermanentId: s.perm("attacker").permanentId,
            target: { kind: "permanent", permanentId: defenderId },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
        expect(s.state.players[opponent]!.security).toHaveLength(2);
        expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
        expect(
          s.engine.applyIntent(opponent, {
            type: "respondBarrier",
            permanentId: defenderId,
            accept,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "attackEnded") && !observe(s.engine).isAttacking());
        expect(s.state.players[opponent]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(accept);
        // Both branches lose the same top security card, but only the deletion branch checks it.
        expect(s.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual([s.inst("safe").instanceId]);
        expect(s.state.players[opponent]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
        expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(accept ? 0 : 1);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );
  }

  it.each([true, false])(
    "Armor Purge accepted=%s prevents Piercing only when the permanent survives",
    async (accept) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT8-053", as: "armor", suspended: true, under: [{ card: "BT3-021", as: "base" }] }],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "safe" },
          ],
        },
      });
      await s.ready();
      const defenderId = s.perm("armor").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT8-053");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "selectCards", instanceIds: accept ? [s.inst("armor").instanceId] : [] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "attackEnded") && !observe(s.engine).isAttacking());
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(accept);
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        accept ? [s.inst("base").instanceId] : [],
      );
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("armor").instanceId);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(accept ? 0 : 1);
      expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
        accept ? [s.inst("top").instanceId, s.inst("safe").instanceId] : [s.inst("safe").instanceId],
      );
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([true, false])(
    "public Divermon evolution placement accepted=%s gates Piercing on the next turn",
    async (accept) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-027", as: "defender" }],
            hand: [
              { card: "BT24-028", as: "divermon" },
              { card: "BT24-027", as: "payment" },
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
            security: [
              { card: "BT1-009", as: "top" },
              { card: "BT1-010", as: "safe" },
            ],
          },
          1: {
            battleArea: [{ card: "BT1-026", as: "attacker" }],
            security: ["BT1-009", "BT1-010"],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const defenderId = s.perm("defender").permanentId;
      const ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: defenderId,
          instanceId: s.inst("divermon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT24-028");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(observe(s.engine).isRestricted(s.perm("defender"), "beDeletedInBattle")).toBe(accept);
      expect(s.perm("defender").stack.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(accept);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: defenderId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.perm("defender").isSuspended).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;
      s.state.turnSeat = 1;
      s.state.memory = 10;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).isRestricted(s.perm("defender"), "beDeletedInBattle")).toBe(accept);
      const eventStart = s.events.length;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.slice(eventStart).some((event) => event.kind === "attackEnded") && !observe(s.engine).isAttacking(),
      );
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(accept);
      expect(s.events.slice(eventStart).filter((event) => event.kind === "securityChecked")).toHaveLength(
        accept ? 0 : 1,
      );
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
        accept ? [s.inst("top").instanceId, s.inst("safe").instanceId] : [s.inst("safe").instanceId],
      );
      expect(s.state.pendingDecision).toBeUndefined();
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
    },
  );
});
