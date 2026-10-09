import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("#5368 Barrier costs versus pending Vortexdramon Piercing", () => {
  for (const seat of [0, 1] as const) {
    for (const alliance of [false, true]) {
      for (const accept of [false, true]) {
        it(`seat ${seat}: Alliance accepted ${alliance}, Barrier accepted ${accept}`, async () => {
          const defenderSeat: Seat = seat === 0 ? 1 : 0;
          const s = setupEngine({
            [seat]: {
              battleArea: [
                { card: "AD1-009", as: "attacker", dp: 14000 },
                { card: "BT10-064", as: "ally" },
              ],
            },
            [defenderSeat]: {
              battleArea: [{ card: "EX13-036", as: "kentauros", suspended: true, under: ["EX13-030"] }],
              security: ["BT1-009", "BT1-010", "BT1-011"],
            },
          });
          s.state.turnSeat = seat;
          s.state.memory = 5;
          await s.ready();
          const defenderId = s.perm("kentauros").permanentId;
          const costId = s.state.players[defenderSeat]!.security[0]!.instanceId;
          expect(
            s.engine.applyIntent(seat, {
              type: "attack",
              attackerPermanentId: s.perm("attacker").permanentId,
              target: { kind: "permanent", permanentId: defenderId },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.events.some((e) => e.kind === "alliancePrompt"));
          expect(
            s.engine.applyIntent(seat, {
              type: "respondAlliance",
              ...(alliance ? { allyPermanentId: s.perm("ally").permanentId } : {}),
            }),
          ).toEqual({ ok: true });
          await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
          expect(s.engine.applyIntent(defenderSeat, { type: "respondCounter" })).toEqual({ ok: true });
          await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
          expect(
            s.engine.applyIntent(defenderSeat, { type: "respondBarrier", permanentId: defenderId, accept }),
          ).toEqual({ ok: true });
          await settle(() => !observe(s.engine).isAttacking());
          expect(s.events.filter((e) => e.kind === "barrierPrompt")).toHaveLength(1);
          expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(accept ? 0 : alliance ? 2 : 1);
          expect(s.state.players[defenderSeat]!.security).toHaveLength(accept ? 2 : alliance ? 1 : 2);
          const firstReveal = s.events.findIndex((e) => e.kind === "securityRevealed");
          const costs = s.events
            .slice(0, firstReveal === -1 ? undefined : firstReveal)
            .flatMap((e) =>
              e.kind === "cardsMoved" && e.from === "security" && e.to === "trash" ? e.instanceIds : [],
            );
          expect(costs).toEqual(accept ? [costId] : []);
          expect(s.state.players[defenderSeat]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(accept);
          expect(s.state.pendingDecision).toBeUndefined();
        });
      }
    }

    it(`seat ${seat}: each separate public attack pays exactly one Barrier cost`, async () => {
      const defenderSeat: Seat = seat === 0 ? 1 : 0;
      const s = setupEngine({
        [seat]: {
          battleArea: [
            { card: "BT1-023", as: "first" },
            { card: "BT1-023", as: "second" },
          ],
        },
        [defenderSeat]: {
          battleArea: [{ card: "EX13-030", as: "defender", suspended: true }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 5;
      await s.ready();
      const securityIds = s.state.players[defenderSeat]!.security.map((c) => c.instanceId);
      const defenderId = s.perm("defender").permanentId;
      for (const [index, alias] of ["first", "second"].entries()) {
        expect(
          s.engine.applyIntent(seat, {
            type: "attack",
            attackerPermanentId: s.perm(alias).permanentId,
            target: { kind: "permanent", permanentId: defenderId },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.filter((e) => e.kind === "barrierPrompt").length === index + 1);
        expect(
          s.engine.applyIntent(defenderSeat, { type: "respondBarrier", permanentId: defenderId, accept: true }),
        ).toEqual({ ok: true });
        await settle(() => !observe(s.engine).isAttacking());
        expect(s.state.players[defenderSeat]!.security.map((c) => c.instanceId)).toEqual(securityIds.slice(index + 1));
      }
      expect(s.state.players[defenderSeat]!.trash.map((c) => c.instanceId)).toEqual(securityIds.slice(0, 2));
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    for (const directDeletion of [false, true]) {
      for (const accept of [false, true]) {
        it(`seat ${seat}: earlier deletion ${directDeletion}, Barrier accepted ${accept}`, async () => {
          const defenderSeat: Seat = seat === 0 ? 1 : 0;
          const preferred: string[] = [];
          const s = setupEngine(
            {
              [seat]: { battleArea: [{ card: "EX11-074", as: "vortex", under: ["EX11-028", "EX11-032"] }] },
              [defenderSeat]: {
                battleArea: [
                  { card: "EX13-036", as: "kentauros", suspended: true, under: ["EX13-030"] },
                  { card: "EX13-026", as: "earlierVictim" },
                ],
                security: [
                  { card: "EX13-026", as: "barrierCost" },
                  { card: "EX13-032", as: "checkedCard" },
                  { card: "ST24-15", as: "lastSecurity" },
                ],
              },
            },
            {
              autoAcceptOptional: true,
              autoSelectCards: true,
              preferInstanceIds: preferred,
              declinePrompts: directDeletion ? [] : ["Battle"],
            },
          );
          s.state.turnSeat = seat;
          s.state.memory = 5;
          preferred.push(s.perm("earlierVictim").permanentId);
          await s.ready();
          const kentaurosId = s.perm("kentauros").permanentId;
          expect(
            s.engine.applyIntent(seat, {
              type: "attack",
              attackerPermanentId: s.perm("vortex").permanentId,
              target: { kind: "permanent", permanentId: kentaurosId },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
          expect(s.engine.applyIntent(defenderSeat, { type: "respondCounter" })).toEqual({ ok: true });
          await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
          expect(
            s.engine.applyIntent(defenderSeat, {
              type: "respondBarrier",
              permanentId: kentaurosId,
              accept,
            }),
          ).toEqual({ ok: true });
          // A repeated response cannot pay a second time for this window.
          expect(
            s.engine.applyIntent(defenderSeat, {
              type: "respondBarrier",
              permanentId: kentaurosId,
              accept: true,
            }).ok,
          ).toBe(false);
          await settle(() => !observe(s.engine).isAttacking());
          const checked = s.events.filter((e) => e.kind === "securityChecked");
          const firstReveal = s.events.findIndex((e) => e.kind === "securityRevealed");
          const costs = s.events
            .slice(0, firstReveal === -1 ? undefined : firstReveal)
            .filter((e) => e.kind === "cardsMoved" && e.from === "security" && e.to === "trash");
          expect(costs).toHaveLength(accept ? 1 : 0);
          expect(
            costs.map((e) => ({
              seat: "seat" in e ? e.seat : undefined,
              instanceIds: "instanceIds" in e ? e.instanceIds : [],
            })),
          ).toEqual(accept ? [{ seat: defenderSeat, instanceIds: [s.inst("barrierCost").instanceId] }] : []);
          expect(checked).toHaveLength(directDeletion || !accept ? 1 : 0);
          expect(s.state.players[defenderSeat]!.security).toHaveLength(
            3 - Number(accept) - Number(directDeletion || !accept),
          );
          expect(s.state.players[defenderSeat]!.battleArea.some((p) => p.permanentId === kentaurosId)).toBe(accept);
          expect(
            s.state.players[defenderSeat]!.battleArea.some(
              (p) => p.topCard.instanceId === s.inst("earlierVictim").instanceId,
            ),
          ).toBe(!directDeletion);
          expect(s.events.filter((e) => e.kind === "barrierPrompt")).toHaveLength(1);
          expect(s.state.pendingDecision).toBeUndefined();
        });
      }
    }
  }
});
