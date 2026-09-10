import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-052.js";

describe("BT1-052 Seasarmon", () => {
  it("matches the catalog and exact Jamming IR contract", () => {
    expect(getCardDefinition("BT1-052")).toMatchObject({
      cardId: "BT1-052",
      set: "BT1",
      nameEn: "Seasarmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      effectText: "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-052",
      nameJp: "シーサモン",
    });
    expect(getCardDefinition("BT1-052")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-052")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-052", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "attacker" }] },
      1: { security: ["BT1-080"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-052");
  });

  it("is still deleted when it loses a battle against a Digimon in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-080", as: "target", dp: 20000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-052")).toBe(true);
  });

  it("retains Jamming after evolving from a yellow level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [{ card: "BT1-052", as: "seasarmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("seasarmon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-050");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });

  it("rejects evolution from a red level 3 despite matching the level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-052", as: "seasarmon" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
