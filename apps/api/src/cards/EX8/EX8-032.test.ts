import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-032.js";

describe("EX8-032", () => {
  it("uses the off-color NSo level-3 route for two and rejects a non-NSo base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-008", as: "base" }],
        hand: [{ card: "EX8-032", as: "apemon" }],
        deck: ["BT1-028", "BT1-037"],
      },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("apemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"));
    expect(s.perm("base").topCard.cardId).toBe("EX8-032");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-008"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-028"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX8-032", as: "apemon" }] },
    });
    await invalid.ready();
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("apemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("inherits a once-per-turn -2000 DP effect against an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent" } },
        },
      ],
    }));

  it("applies the inherited effect to the exact opposing target and only once per turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker", under: ["EX8-032"] }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "target" },
            { card: "AD1-001", as: "other" },
          ],
          security: 2,
          deck: ["BT1-045"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    const attacker = s.perm("attacker");
    const target = s.perm("target");
    const other = s.perm("other");
    preferInstanceIds.push(target.permanentId);
    const targetInstanceId = target.topCard!.instanceId;
    const before = target.currentDP;
    const otherBefore = other.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 2000);

    expect(target.topCard!.instanceId).toBe(targetInstanceId);
    expect(target.currentDP).toBe(before - 2000);
    expect(other.currentDP).toBe(otherBefore);

    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([attacker.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(target.currentDP).toBe(before - 2000);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(target.currentDP).toBe(before);
  });
});
