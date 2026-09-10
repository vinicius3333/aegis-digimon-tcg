import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-057.js";

describe("BT1-057 Sirenmon", () => {
  it("matches the catalog and residual-free vanilla IR contract", () => {
    expect(getCardDefinition("BT1-057")).toMatchObject({
      cardId: "BT1-057",
      set: "BT1",
      nameEn: "Sirenmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Shaman"],
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-057",
      nameJp: "セイレーンモン",
    });
    expect(getCardDefinition("BT1-057")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-057")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-057")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 5 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-057", as: "sirenmon" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sirenmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves through a legal yellow level 4 for exactly 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [{ card: "BT1-057", as: "sirenmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("sirenmon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-056"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects a red level 4 despite matching the evolution level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "redBase" }], hand: [{ card: "BT1-057", as: "sirenmon" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
