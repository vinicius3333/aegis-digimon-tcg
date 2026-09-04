import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-006.js";

describe("EX3-006 Flarerizamon", () => {
  it("matches its official identity and inherited text", () => {
    expect(getCardDefinition("EX3-006")).toMatchObject({
      cardId: "EX3-006",
      nameEn: "Flarerizamon",
      colors: ["Red"],
      level: 4,
      playCost: 4,
      dp: 5000,
      types: ["Fire Dragon"],
    });
    expect(getCardDefinition("EX3-006")!.inheritedEffectText).toContain("[Dragon], [saur], or [Ceratopsian]");
  });
  it("draws once when its attacking carrier has the Dragonkin trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-006"], as: "attacker" }], deck: ["BT1-009"] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw for a carrier outside the Dragon/saur/Ceratopsian family", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", under: ["EX3-006"], as: "attacker" }], deck: ["BT1-009"] },
      1: { security: ["BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it.each([
    ["Dragon", "BT11-022"],
    ["saur", "AD1-001"],
    ["Ceratopsian", "BT10-050"],
    ["Dragonkin (Q3371)", "EX3-008"],
  ])("draws for the %s trait family without opening a decision", async (_family, carrier) => {
    const s = setupEngine({
      0: { battleArea: [{ card: carrier, under: ["EX3-006"], as: "attacker" }], deck: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions).toHaveLength(0);
  });

  it("is once per turn, resets next turn, and lets two inherited copies draw independently", async () => {
    const one = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", under: ["EX3-006"], as: "attacker", dp: 20_000 }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-012", as: "target1", suspended: true },
          { card: "BT1-013", as: "target2", suspended: true },
          { card: "BT1-014", as: "target3", suspended: true },
        ],
      },
    });
    await one.ready();
    let target = 0;
    const attack = () =>
      one.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: one.perm("attacker").permanentId,
        target: { kind: "permanent" as const, permanentId: one.perm(`target${++target}`).permanentId },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => one.state.players[0]!.hand.length === 1 && !observe(one.engine).isAttacking());
    await advance(one.engine).verb.unsuspend([one.perm("attacker").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => one.state.players[1]!.battleArea.length === 1 && !observe(one.engine).isAttacking());
    expect(one.state.players[0]!.hand).toHaveLength(1);

    await advance(one.engine).runTurn(0);
    const handAfterPublicTurnTransition = one.state.players[0]!.hand.length;
    await advance(one.engine).fire(EffectTiming.OnUseAttack, one.perm("attacker"));
    await settle(() => one.state.players[0]!.hand.length === handAfterPublicTurnTransition + 1);

    const two = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", under: ["EX3-006", "EX3-006"], as: "attacker" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-011"] },
    });
    expect(
      two.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: two.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => two.state.players[0]!.hand.length === 2);
    expect(two.state.players[0]!.hand).toHaveLength(2);
  });

  it("resolves safely with an empty deck", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-006"], as: "attacker" }] },
      1: { security: ["BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
