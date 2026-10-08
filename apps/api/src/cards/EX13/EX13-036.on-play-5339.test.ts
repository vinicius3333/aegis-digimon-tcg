import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX13-036";
const deck = ["BT1-011", "BT1-012", "BT1-013"];

describe("GH5339 — Kentaurosmon public On Play decisions", () => {
  for (const seat of [0, 1] as const) {
    const opponent: Seat = seat === 0 ? 1 : 0;
    for (const totalSecurity of [6, 7]) {
      for (const hasTargets of [false, true]) {
        it(`seat ${seat}, ${totalSecurity} security, Homeros ${hasTargets ? "with Digimon" : "alone"}: queues and resolves only the DP clause`, async () => {
          const s = setupEngine(
            {
              [seat]: { hand: [{ card: cardId, as: "kent" }], deck, security: 3 },
              [opponent]: {
                battleArea: [
                  { card: "BT24-102", as: "homeros" },
                  ...(hasTargets
                    ? [
                        { card: "BT24-040", as: "venus" },
                        { card: "BT1-024", as: "other" },
                      ]
                    : []),
                ],
                deck,
                security: totalSecurity - 3,
              },
            },
            { autoOrderTriggers: false },
          );
          s.state.turnSeat = seat;
          s.state.memory = 10;
          await s.ready();
          expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("kent").instanceId })).toEqual({
            ok: true,
          });
          if (hasTargets && totalSecurity === 7) {
            await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
            // Single mandatory effects resolve without a trigger-order prompt.
            // Target selection pauses resolution, so neither Digimon has lost DP yet.
            expect(s.perm("venus").currentDP).toBe(13_000);
            expect(s.perm("other").currentDP).toBe(10_000);
            const selection = s.decisions.at(-1)!;
            expect(selection.seat).toBe(seat);
            expect(selection.req.options?.candidateInstanceIds).toEqual(
              expect.arrayContaining([s.perm("venus").permanentId, s.perm("other").permanentId]),
            );
            expect(selection.req.options?.candidateInstanceIds).not.toContain(s.perm("homeros").permanentId);
            expect(
              s.engine.applyIntent(seat, {
                type: "respondDecision",
                decisionId: selection.req.decisionId,
                response: { kind: "chooseTargets", instanceIds: [s.perm("homeros").permanentId] },
              }).ok,
            ).toBe(false);
            expect(
              s.engine.applyIntent(opponent, {
                type: "respondDecision",
                decisionId: selection.req.decisionId,
                response: { kind: "chooseTargets", instanceIds: [s.perm("other").permanentId] },
              }).ok,
            ).toBe(false);
            expect(
              s.engine.applyIntent(seat, {
                type: "respondDecision",
                decisionId: selection.req.decisionId,
                response: { kind: "chooseTargets", instanceIds: [s.perm("other").permanentId] },
              }),
            ).toEqual({ ok: true });
          }
          await settle(() =>
            s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === cardId && e.timing === "OnPlay"),
          );
          expect(s.state.pendingDecision).toBeUndefined();
          expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", seat, cardId }));
          expect(s.decisions.filter((d) => d.req.kind === "orderTriggers")).toHaveLength(0);
          expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === cardId)).toHaveLength(1);
          expect(s.decisions.filter((d) => d.req.kind === "chooseTargets")).toHaveLength(
            hasTargets && totalSecurity === 7 ? 1 : 0,
          );
          if (hasTargets) {
            expect(s.perm("venus").currentDP).toBe(totalSecurity === 6 ? 6000 : 13_000);
            expect(s.perm("other").currentDP).toBe(3000);
          }
          expect(s.state.players[seat]!.security).toHaveLength(3);
          expect(s.state.players[opponent]!.security).toHaveLength(totalSecurity - 3);
          expect(s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === cardId)).toBe(true);
          assertNoLoudGap(s);
        });
      }
    }

    it(`seat ${seat}: Venusmon timing suppression does not suppress Kentaurosmon On Play`, async () => {
      const s = setupEngine({
        [seat]: { hand: [{ card: cardId, as: "kent" }], deck, security: 3 },
        [opponent]: {
          battleArea: [
            { card: "BT10-038", as: "venus" },
            { card: "BT24-102", as: "homeros" },
          ],
          hand: [{ card: "BT10-042", as: "evolution" }],
          deck,
          security: 3,
        },
      });
      s.state.turnSeat = opponent;
      s.state.memory = 4;
      await s.ready();
      expect(
        s.engine.applyIntent(opponent, {
          type: "digivolve",
          permanentId: s.perm("venus").permanentId,
          instanceId: s.inst("evolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT10-042"));
      // Establish the next player's main phase with the actual, publicly activated debuff still present.
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await advance(s.engine).recompute();
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("kent").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === cardId && e.timing === "OnPlay"),
      );
      const kent = s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
      expect(observe(s.engine).keywordAmount(kent, "SecurityAttack")).toBe(-1);
      expect(observe(s.engine).timingEffectDisabled(kent, "whenDigivolving")).toBe(true);
      expect(observe(s.engine).timingEffectDisabled(kent, "whenAttacking")).toBe(true);
      expect(s.perm("venus").currentDP).toBe(5000);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });
  }
});
