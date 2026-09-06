import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-022.js";
import "./index.js";

describe("BT20-022 Crabmon (X Antibody)", () => {
  it("protects one of your Digimon from battle deletion on entry and draws at the inherited hand boundary", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            restriction: "beDeletedInBattle",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Crabmon"], cost: 0, isAlternate: true }]);
  });

  it("protects the selected ally from battle deletion through the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-022", as: "crabmonX" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "protected" },
          ],
        },
        1: { battleArea: [{ card: "BT20-017", dp: 11000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("crabmonX"));
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 50);
    expect(s.perm("protected")).toBeDefined();
  });

  it("reaches Crabmon (X Antibody) from a legal Crabmon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-019", as: "crabmon" }], hand: [{ card: "BT20-022", as: "crabmonX" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crabmon").permanentId,
        instanceId: s.inst("crabmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crabmon").topCard.cardId === "BT20-022");
    expect(s.perm("crabmon").topCard.cardId).toBe("BT20-022");
    expect(s.perm("crabmon").stack.map((card) => card.cardId)).toEqual(["BT15-019"]);
  });

  it("inherits Draw 1 at exactly 7 hand cards and only once per turn", async () => {
    const hand = Array.from({ length: 7 }, () => "BT20-001");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-023", as: "host", under: ["BT20-022"] }],
        hand,
        deck: ["BT20-003", "BT20-004"],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);

    const over = setupEngine({
      0: {
        battleArea: [{ card: "BT20-023", as: "host", under: ["BT20-022"] }],
        hand: Array.from({ length: 8 }, () => "BT20-001"),
        deck: ["BT20-003"],
      },
    });
    await advance(over.engine).fire(EffectTiming.OnUseAttack, over.perm("host"));
    expect(over.state.players[0]!.hand).toHaveLength(8);
  });
});
