import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-059.js";

describe("BT1-059 Piximon", () => {
  it("matches the catalog and residual-free vanilla IR contract", () => {
    expect(getCardDefinition("BT1-059")).toMatchObject({
      cardId: "BT1-059",
      set: "BT1",
      nameEn: "Piximon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 9000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Fairy"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-059",
      nameJp: "ピッコロモン",
    });
    expect(getCardDefinition("BT1-059")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-059")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-059")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 6 memory as a 9000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-059", as: "piximon" }] } });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piximon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 9000, currentDP: 9000 });
  });

  it("digivolves through a legal yellow level 4 for exactly 3 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [{ card: "BT1-059", as: "piximon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("piximon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 9000, currentDP: 9000 });
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-056"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects a red level 4 despite matching the evolution level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "redBase" }], hand: [{ card: "BT1-059", as: "piximon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
