import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX3-006.js";

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

  it("encodes Q3371's Dragonkin inclusion as a trait-only once-per-turn gate", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: {
        kind: "selfHasTrait",
        filter: {
          nameOrTrait: expect.arrayContaining([
            { tokens: ["Dragon"], match: "traitContains" },
            { tokens: ["saur"], match: "traitContains" },
            { tokens: ["Ceratopsian"], match: "traitContains" },
            { tokens: ["Dragonkin"], match: "trait" },
          ]),
        },
      },
    });
  });

  it("digivolves from a red level 3 for the printed cost and rejects an invalid source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX3-006", as: "flarerizamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flarerizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-006");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "base" }],
        hand: [{ card: "EX3-006", as: "flarerizamon" }],
      },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("flarerizamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("base").topCard.cardId).toBe("BT1-038");
    expect(invalid.inst("flarerizamon").cardId).toBe("EX3-006");
    expect(invalid.state.memory).toBe(5);
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
    ["Dragon substring", "EX3-047"],
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
          { card: "BT1-009", as: "opponent", suspended: true },
        ],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-011"],
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
    await settle(() => one.state.players[1]!.battleArea.length === 2 && !observe(one.engine).isAttacking());
    expect(one.state.players[0]!.hand).toHaveLength(1);

    const turnLoop = one.engine.startTurnLoop();
    await advance(one.engine).waitForMainPhase(0);
    expect(one.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(one.engine).waitForMainPhase(1);
    expect(one.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(one.engine).waitForMainPhase(0);
    const handBeforeResetAttack = one.state.players[0]!.hand.length;
    const resetAttack = one.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: one.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(resetAttack).toEqual({ ok: true });
    await settle(() => one.state.players[0]!.hand.length === handBeforeResetAttack + 1);
    expect(one.state.players[0]!.hand).toHaveLength(handBeforeResetAttack + 1);
    expect(one.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;

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
