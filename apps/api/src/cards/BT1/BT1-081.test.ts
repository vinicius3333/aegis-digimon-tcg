import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-081.js";

describe("BT1-081 HerculesKabuterimon", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("BT1-081")).toMatchObject({
      cardId: "BT1-081",
      set: "BT1",
      nameEn: "HerculesKabuterimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 10000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Insectoid"],
      rarity: "SR",
      maxCountInDeck: 4,
      imageId: "BT1-081",
      nameJp: "ヘラクルカブテリモン",
    });
    expect(getCardDefinition("BT1-081")?.effectText).toContain("Twice Per Turn");
    expect(getCardDefinition("BT1-081")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-081")?.securityEffectText).toBeUndefined();
  });

  it("digivolves from a green level 5 for 3 memory, draws, and preserves its source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "base" }],
        hand: [{ card: "BT1-081", as: "hercules" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hercules").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hercules").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-076"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("rejects evolution from a non-green level 5", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "redBase" }], hand: [{ card: "BT1-081", as: "hercules" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("hercules").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses Piercing after deleting an opposing Digimon in battle and surviving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-073", "BT1-076"] }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "defender", dp: 1000, suspended: true }],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("has Piercing and can pay 3 memory to unsuspend at end of attack twice per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 20000 }] },
        1: { security: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 9;
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 6 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && !s.perm("attacker").isSuspended && !combat.combat.isAttacking);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !combat.combat.isAttacking);
  });

  it("may decline the End of Attack effect (Q935)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker" }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT1-081" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("ends the turn for the opponent after paying 3 memory across zero (Q934)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker" }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.state.phase).toBe(Phase.End);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0, nextSeat: 1 }));
  });
});
