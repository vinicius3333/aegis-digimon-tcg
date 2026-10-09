import { type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-063.js";

// Memory is turn-relative, including when seat 1 is the active player.
describe("GitHub #5353: EX3-063 public Blitz declarations", () => {
  for (const seat of [0, 1] as const) {
    const opponent = (1 - seat) as Seat;
    for (const route of ["normal", "dna"] as const) {
      for (const endingMemory of [-2, 0, 2]) {
        it(`${route}, seat ${seat}, memory ${endingMemory}: Blitz only offers an attack on negative memory`, async () => {
          const s = setupEngine({
            [seat]: {
              battleArea: [
                { card: "EX3-061", as: "purple" },
                ...(route === "dna" ? [{ card: "EX3-010", suspended: true, as: "red" }] : []),
              ],
              hand: [{ card: "EX3-063", as: "dragon" }],
              deck: ["BT1-009", "BT1-010"],
            },
            [opponent]: { security: ["BT1-009", "BT1-010"] },
          });
          s.state.turnSeat = seat;
          s.state.memory = endingMemory + (route === "normal" ? 4 : 0);
          await s.ready();
          expect(
            s.engine.applyIntent(
              seat,
              route === "normal"
                ? {
                    type: "digivolve",
                    permanentId: s.perm("purple").permanentId,
                    instanceId: s.inst("dragon").instanceId,
                  }
                : {
                    type: "dnaDigivolve",
                    materialPermanentIds: [s.perm("purple").permanentId, s.perm("red").permanentId],
                    instanceId: s.inst("dragon").instanceId,
                  },
            ),
          ).toEqual({ ok: true });
          await settle(() =>
            endingMemory < 0
              ? s.state.pendingDecision?.kind === "optional"
              : s.engine.mainVerbContinuationsInFlight === 0,
          );
          const dragon = s.state.players[seat]!.battleArea[0]!;
          expect(dragon.topCard.cardId).toBe("EX3-063");
          expect(s.state.memory).toBe(endingMemory);
          expect(observe(s.engine).hasKeyword(dragon, "Blitz")).toBe(true);
          if (endingMemory < 0) {
            expect(JSON.parse(s.state.pendingDecision!.payloadJson).promptKey).toBe("activateBlitz");
            expect(s.state.pendingDecision!.seat).toBe(seat);
            expect(
              s.engine.applyIntent(seat, {
                type: "respondDecision",
                decisionId: s.state.pendingDecision!.decisionId,
                response: { kind: "optional", accept: true },
              }),
            ).toEqual({ ok: true });
            await settle(() => s.engine.hasAcceptedBlitzAttack(dragon.permanentId));
            expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
            expect(dragon.canAttackPlayer).toBe(true);
            expect(
              s.engine.applyIntent(opponent, {
                type: "attack",
                attackerPermanentId: dragon.permanentId,
                target: { kind: "player" },
              }),
            ).toEqual({ ok: false, reason: "not-your-turn" });
            expect(
              s.engine.applyIntent(seat, {
                type: "attack",
                attackerPermanentId: dragon.permanentId,
                target: { kind: "player" },
              }),
            ).toEqual({ ok: true });
            await settle(
              () =>
                s.state.players[opponent]!.security.length === (route === "dna" ? 0 : 1) &&
                s.engine.mainVerbContinuationsInFlight === 0,
            );
            expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
            expect(dragon.currentDP).toBe(14000);
          } else {
            expect(s.decisions).toHaveLength(0);
            expect(s.engine.pendingBlitzAttack).toBeUndefined();
            expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
          }
          expect(s.state.pendingDecision).toBeUndefined();
          assertNoLoudGap(s);
        });
      }
    }
    it(`seat ${seat}: may decline Blitz after ordinary evolution`, async () => {
      const s = setupEngine({
        [seat]: { battleArea: [{ card: "EX3-061", as: "base" }], hand: [{ card: "EX3-063", as: "dragon" }] },
        [opponent]: { security: ["BT1-009"] },
      });
      s.state.turnSeat = seat;
      s.state.memory = 2;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dragon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.players[opponent]!.security).toHaveLength(1);
      expect(s.engine.pendingBlitzAttack).toBeUndefined();
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
      assertNoLoudGap(s);
    });
    it(`seat ${seat}: Blitz does not unsuspend an ordinary-evolution host`, async () => {
      const s = setupEngine({
        [seat]: {
          battleArea: [{ card: "EX3-061", suspended: true, as: "base" }],
          hand: [{ card: "EX3-063", as: "dragon" }],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 2;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dragon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.perm("base").isSuspended).toBe(true);
      expect(s.engine.pendingBlitzAttack).toBeUndefined();
      expect(s.decisions).toHaveLength(0);
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(0);
      assertNoLoudGap(s);
    });
  }
});
