import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-071.js";

describe("BT1-071 Vegiemon", () => {
  it("matches the catalog and residual-free vanilla IR contract", () => {
    expect(getCardDefinition("BT1-071")).toMatchObject({
      cardId: "BT1-071",
      set: "BT1",
      nameEn: "Vegiemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 6000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 1 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Carnivorous Plant"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-071",
      nameJp: "ベジーモン",
    });
    expect(getCardDefinition("BT1-071")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-071")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-071")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 4 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-071", as: "vegiemon" }] } });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vegiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves from a green level 3 for 1 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "BT1-071", as: "vegiemon" }],
        deck: [{ card: "BT1-072", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vegiemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-071", as: "vegiemon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
