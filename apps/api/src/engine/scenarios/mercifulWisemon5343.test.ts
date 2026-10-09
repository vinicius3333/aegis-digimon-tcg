import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("#5343 Merciful Mode attack through Wisemon Barrier", () => {
  it.each([0, 1] as const)("seat %i: legal security battle deletion still ends the original attack", async (seat) => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [{ card: "BT1-043", as: "attacker" }],
          hand: [{ card: "EX13-077", as: "merciful" }],
          deck: ["BT1-009", "BT1-009"],
          security: 5,
        },
        [opponent]: {
          battleArea: [{ card: "EX13-034", as: "wisemon" }],
          security: ["BT1-009", "BT1-084"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(seat, {
        type: "digivolve",
        permanentId: attackerId,
        instanceId: s.inst("merciful").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(opponent, {
        type: "respondBarrier",
        permanentId: s.perm("wisemon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some(({ kind }) => kind === "attackEnded"));
    expect(s.state.players[seat]!.battleArea).toHaveLength(0);
    expect(s.state.players[seat]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX13-077", "BT1-043"]),
    );
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
  for (const seat of [0, 1] as const) {
    for (const target of ["player", "wisemon"] as const) {
      it.each([
        { security: 4, accept: true, survives: true, payments: 2, checks: 1 },
        { security: 4, accept: false, survives: false, payments: 0, checks: 1 },
        { security: 1, accept: true, survives: false, payments: 1, checks: 0 },
        { security: 0, accept: true, survives: false, payments: 0, checks: 0 },
      ])(
        "seat " + seat + " targeting " + target + ": $security security, Barrier $accept",
        async ({ security, accept, survives, payments, checks }) => {
          const opponent: Seat = seat === 0 ? 1 : 0;
          const preferInstanceIds: string[] = [];
          const s = setupEngine(
            {
              [seat]: {
                battleArea: [{ card: "BT1-084", as: "attacker", under: ["BT1-009", "BT1-028", "BT1-064"] }],
                hand: [{ card: "EX13-077", as: "merciful" }],
                deck: ["BT1-009", "BT1-009"],
                security: 5,
              },
              [opponent]: {
                battleArea: [{ card: "EX13-034", as: "wisemon", suspended: true }],
                security: Array.from({ length: security }, () => "BT1-009"),
                deck: ["BT1-009"],
              },
            },
            { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
          );
          s.state.turnSeat = seat;
          s.state.memory = 10;
          await s.ready();
          const attackerId = s.perm("attacker").permanentId;
          const wisemonId = s.perm("wisemon").permanentId;
          if (target === "wisemon") preferInstanceIds.push(wisemonId);
          expect(
            s.engine.applyIntent(seat, {
              type: "digivolve",
              permanentId: attackerId,
              instanceId: s.inst("merciful").instanceId,
              useAlternateCost: true,
            }),
          ).toEqual({ ok: true });
          const attackPayment = target === "wisemon" && survives ? 1 : 0;
          const expectedPayments = payments + attackPayment;
          const expectedChecks = target === "wisemon" ? 0 : checks;
          const prompts = accept ? expectedPayments : 1;
          for (let index = 1; index <= prompts; index++) {
            await settle(() => s.events.filter(({ kind }) => kind === "barrierPrompt").length === index);
            expect(observe(s.engine).isAttacking()).toBe(true);
            expect(
              s.engine.applyIntent(seat, { type: "respondBarrier", permanentId: wisemonId, accept }),
            ).toMatchObject({ ok: false });
            expect(s.engine.applyIntent(opponent, { type: "respondBarrier", permanentId: wisemonId, accept })).toEqual({
              ok: true,
            });
          }
          const winsDirectly = target === "player" && security <= expectedPayments;
          await settleAcrossTimers(() => s.state.gameOver || s.events.some(({ kind }) => kind === "attackEnded"));
          // Game over is terminal: the engine publishes the win instead of later attack timings.
          expect(s.events.filter(({ kind }) => kind === "attackEnded")).toHaveLength(winsDirectly ? 0 : 1);
          expect(s.events.find(({ kind }) => kind === "attackDeclared")).toMatchObject({
            seat,
            attackerPermanentId: attackerId,
            target: target === "player" ? { kind: "player" } : { kind: "permanent", permanentId: wisemonId },
          });
          expect(s.events.filter((event) => event.kind === "battleCompared" && !event.effectBattle)).toHaveLength(
            attackPayment,
          );
          expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(expectedChecks);
          expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(prompts);
          expect(s.state.players[opponent]!.security).toHaveLength(security - expectedPayments - expectedChecks);
          expect(s.state.players[opponent]!.battleArea.some(({ permanentId }) => permanentId === wisemonId)).toBe(
            survives,
          );
          expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(
            accept && security > 0 ? 2 : 1,
          );
          // Wisemon's pending reaction activates after the whole modal effect. If the second
          // battle deletes Wisemon, its pending reaction loses its source and cannot activate.
          expect(s.perm("attacker").topCard.cardId).toBe(survives ? "BT1-084" : "EX13-077");
          expect(s.state.gameOver).toBe(winsDirectly);
          if (s.state.gameOver) expect(s.state.winnerSeat).toBe(seat);
          expect(s.state.pendingDecision).toBeUndefined();
          expect(observe(s.engine).isAttacking()).toBe(false);
          if (security > expectedPayments) {
            // The effect attack did not suspend: another public attack proves the action lock cleared.
            expect(
              s.engine.applyIntent(seat, {
                type: "attack",
                attackerPermanentId: attackerId,
                target: { kind: "player" },
              }),
            ).toEqual({ ok: true });
            await settleAcrossTimers(() => s.events.filter(({ kind }) => kind === "attackEnded").length === 2);
          }
        },
      );
    }
  }
});
