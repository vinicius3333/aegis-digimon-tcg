import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-027.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-027", () => {
  it("gives an opposing Digimon -4000 DP on digivolving or deletion by trashing a hand card", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -4000,
            duration: "forTheTurn",
            cost: { kind: "trash", target: { filter: { zone: "hand" } } },
          },
        ],
      });
    }
  });
  it("inherits once-per-turn attack prevention by deleting another own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack", cost: { kind: "deleteOwn" } }],
        },
      ],
    });
  });

  it("trashes the hand card and reduces one opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-001"], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 5000);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trash the hand card or reduce DP when the optional digivolution cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes another Digimon and ends an opponent's attack before the security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-041", as: "host", under: ["EX9-027"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the hand card and reduces one opposing Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.perm("target").currentDP !== 5000);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
