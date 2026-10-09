import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-066.js";
import "../AD1/AD1-012.js";
import "../BT18/BT18-022.js";

describe("#5366 Analog Youth and CresGarurumon battle deletion", () => {
  for (const owner of [0, 1] as const) {
    const opponent: Seat = owner === 0 ? 1 : 0;

    for (const control of ["decline", "suspended", "no sources", "occupied breeding"] as const) {
      it(`seat ${owner}: ${control} after an opponent deletes allied CresGarurumon`, async () => {
        const s = setupEngine(
          {
            [owner]: {
              battleArea: [
                { card: "EX1-066", as: "analog", suspended: control === "suspended" },
                {
                  card: "AD1-012",
                  as: "cres",
                  suspended: true,
                  under: control === "no sources" ? [] : ["AD1-010", "EX9-019"],
                },
              ],
              eggDeck: ["EX4-003"],
              ...(control === "occupied breeding" ? { breeding: { card: "BT1-029", as: "raised" } } : {}),
            },
            [opponent]: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 21000 }] },
          },
          { autoDeclineOptional: true, autoOrderTriggers: true },
        );
        s.state.turnSeat = opponent;
        await s.ready();
        const cresId = s.inst("cres").instanceId;
        const attackerId = s.perm("attacker").permanentId;
        expect(
          s.engine.applyIntent(opponent, {
            type: "attack",
            attackerPermanentId: attackerId,
            target: { kind: "permanent", permanentId: s.perm("cres").permanentId },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "attackEnded"));
        expect(s.state.players[owner]!.trash.some((card) => card.instanceId === cresId)).toBe(true);
        const analogPrompts = s.decisions.filter(({ req }) => req.sourceCardId === "EX1-066");
        expect(analogPrompts.length > 0).toBe(control !== "no sources" && control !== "suspended");

        // This pass deliberately refuses the printed cost through a real decision.
        expect(s.perm("analog").isSuspended).toBe(control === "suspended");
        expect(s.state.memory).toBe(0);
        expect(s.state.players[owner]!.eggDeck).toHaveLength(1);
      });
    }

    for (const occupied of [false, true]) {
      it(`seat ${owner}: explicitly pays after battle deletion with breeding occupied=${occupied}`, async () => {
        const s = setupEngine(
          {
            [owner]: {
              battleArea: [
                { card: "EX1-066", as: "analog" },
                { card: "AD1-012", as: "cres", suspended: true, under: ["AD1-010", "EX9-019"] },
              ],
              eggDeck: ["EX4-003"],
              ...(occupied ? { breeding: { card: "BT1-029", as: "raised" } } : {}),
            },
            [opponent]: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 21000 }] },
          },
          { autoOrderTriggers: true },
        );
        s.state.turnSeat = opponent;
        await s.ready();
        expect(
          s.engine.applyIntent(opponent, {
            type: "attack",
            attackerPermanentId: s.perm("attacker").permanentId,
            target: { kind: "permanent", permanentId: s.perm("cres").permanentId },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.kind === "optional");
        // Decline CresGarurumon's attack-response clauses before paying Analog Youth.
        while (s.decisions.at(-1)?.req.sourceCardId !== "EX1-066") {
          const redirect = s.decisions.at(-1)!;
          expect(redirect.req.sourceCardId).toBe("AD1-012");
          expect(redirect.req.kind).toBe("optional");
          expect(
            s.engine.applyIntent(owner, {
              type: "respondDecision",
              decisionId: redirect.req.decisionId,
              response: { kind: "optional", accept: false },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.decisions.at(-1)?.req.decisionId !== redirect.req.decisionId);
        }
        const decision = s.decisions.at(-1)!;
        expect(decision.seat).toBe(owner);
        expect(decision.req.sourceCardId).toBe("EX1-066");
        expect(s.perm("analog").isSuspended).toBe(false);
        expect(s.state.memory).toBe(0);
        expect(
          s.engine.applyIntent(owner, {
            type: "respondDecision",
            decisionId: decision.req.decisionId,
            response: { kind: "optional", accept: true },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "attackEnded"));
        expect(s.state.pendingDecision).toBeUndefined();
        expect(s.perm("analog").isSuspended).toBe(true);
        expect(s.state.memory).toBe(-1);
        expect(s.state.players[owner]!.breeding?.topCard.cardId).toBe(occupied ? "BT1-029" : "EX4-003");
        expect(s.state.players[owner]!.eggDeck).toHaveLength(occupied ? 1 : 0);
      });
    }

    it(`seat ${owner}: Kumamon removes both sources before the reported battle`, async () => {
      const s = setupEngine(
        {
          [owner]: {
            battleArea: [
              { card: "EX1-066", as: "analog" },
              { card: "AD1-012", as: "cres", suspended: true, under: ["AD1-010", "EX9-019"] },
            ],
            eggDeck: ["EX4-003"],
          },
          [opponent]: {
            hand: [{ card: "BT18-022", as: "kumamon" }],
            battleArea: [
              { card: "BT1-029", as: "base" },
              { card: "BT1-009", as: "attacker", dp: 21000 },
            ],
            deck: ["BT1-029"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
      );
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(opponent, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kumamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("cres").stack.length === 0 && s.state.pendingDecision === undefined);
      expect(s.state.players[owner]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["AD1-010", "EX9-019"]),
      );
      const memoryBeforeBattle = s.state.memory;
      expect(
        s.engine.applyIntent(opponent, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("cres").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "attackEnded"));
      expect(s.state.players[owner]!.trash.some((card) => card.cardId === "AD1-012")).toBe(true);
      expect(s.decisions.some(({ req }) => req.sourceCardId === "EX1-066")).toBe(false);
      expect(s.perm("analog").isSuspended).toBe(false);
      expect(s.state.memory).toBe(memoryBeforeBattle);
      expect(s.state.players[owner]!.breeding).toBeUndefined();
      expect(s.state.players[owner]!.eggDeck).toHaveLength(1);
    });
  }
});
