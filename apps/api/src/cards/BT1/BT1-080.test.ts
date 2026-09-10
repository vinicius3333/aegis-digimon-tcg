import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT1-080.js";

describe("BT1-080 Titamon", () => {
  it("matches the catalog and vanilla IR contract", () => {
    expect(getCardDefinition("BT1-080")).toMatchObject({
      cardId: "BT1-080",
      set: "BT1",
      nameEn: "Titamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 10,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 2 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Shaman"],
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-080",
      nameJp: "タイタモン",
    });
    expect(getCardDefinition("BT1-080")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-080")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-080")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 10 memory as a 12000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-080", as: "titamon" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 12000, currentDP: 12000 });
  });

  it("digivolves from a green level 5 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-075", as: "base" }],
        hand: [{ card: "BT1-080", as: "titamon" }],
        deck: [{ card: "BT1-081", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 12000, currentDP: 12000 });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a non-green level 5", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "blueBase" }], hand: [{ card: "BT1-080", as: "titamon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
