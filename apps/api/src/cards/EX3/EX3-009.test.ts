import { getCardDefinition } from "@aegis/shared";
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
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Dragon"],
      imageId: "EX3-009",
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
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
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
            },
          ],
        },
      ],
    });
  });

  it("digivolves from a red level 4 for the printed cost and rejects an invalid source", async () => {
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

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT3-083", as: "base" }],
        hand: [{ card: "EX3-009", as: "volcdramon" }],
      },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("volcdramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.perm("base").topCard.cardId).toBe("BT3-083");
    expect(invalid.state.memory).toBe(5);
    expect(invalid.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      invalid.inst("volcdramon").instanceId,
    );
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
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
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

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const handBeforeResetAttack = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBeforeResetAttack + 1);
    expect(s.state.players[0]!.hand).toHaveLength(handBeforeResetAttack + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
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

  it("retains the inherited source through a public multi-step evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", as: "base" }],
        hand: [
          { card: "EX3-009", as: "volcdramon" },
          { card: "BT1-026", as: "top" },
        ],
        deck: [{ card: "BT1-009", as: "baseDraw" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-009");
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("top").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-026");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX3-008", "EX3-009"]);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("baseDraw").instanceId));
  });
});
