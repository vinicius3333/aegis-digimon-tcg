import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX3-009.js";

describe("EX3-009 Volcdramon", () => {
  it("matches its official identity and inherited text", () => {
    expect(getCardDefinition("EX3-009")).toMatchObject({
      cardId: "EX3-009",
      nameEn: "Volcdramon",
      colors: ["Red"],
      level: 5,
      playCost: 6,
      dp: 7000,
      types: ["Dragon"],
    });
    expect(getCardDefinition("EX3-009")!.inheritedEffectText).toContain("[Dragon], [saur], or [Ceratopsian]");
  });
  it("keeps the saur clause trait-only", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    const condition = effect?.actions[0]?.condition;
    expect(condition).toMatchObject({
      kind: "selfHasTrait",
      filter: { nameOrTrait: expect.arrayContaining([{ tokens: ["saur"], match: "traitContains" }]) },
    });
  });

  it("digivolves from a red level 4 for the printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", as: "base" }],
        hand: [{ card: "EX3-009", as: "volcdramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-009");

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("EX3-008");
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws once when its attacking carrier has the Dragonkin trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-009"], as: "attacker" }], deck: ["BT1-009"] },
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
    expect(s.decisions).toHaveLength(0);
  });

  it("does not draw for a carrier outside the Dragon/saur/Ceratopsian family", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", under: ["EX3-009"], as: "attacker" }], deck: ["BT1-009"] },
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
    ["Dragonkin (Q3376)", "EX3-008"],
  ])("draws for the %s trait family", async (_family, carrier) => {
    const s = setupEngine({
      0: { battleArea: [{ card: carrier, under: ["EX3-009"], as: "attacker" }], deck: ["BT1-009"] },
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

  it("is once per turn for one copy and becomes available after the turn-use ledger resets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", under: ["EX3-009"], as: "attacker", dp: 20_000 }],
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
    await s.ready();

    let attackIndex = 0;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(`target${++attackIndex}`).permanentId },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    const handAfterPublicTurnTransition = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.state.players[0]!.hand.length === handAfterPublicTurnTransition + 1);
  });

  it("lets two inherited copies activate independently on the same attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", under: ["EX3-009", "EX3-009"], as: "attacker" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-011"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("resolves safely when the deck is empty", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-009"], as: "attacker" }] },
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
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
