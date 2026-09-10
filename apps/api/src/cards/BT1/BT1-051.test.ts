import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-051.js";

describe("BT1-051 Reppamon", () => {
  it("matches the catalog and residual-free vanilla IR contract", () => {
    expect(getCardDefinition("BT1-051")).toMatchObject({
      cardId: "BT1-051",
      set: "BT1",
      nameEn: "Reppamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-051",
      nameJp: "レッパモン",
    });
    expect(getCardDefinition("BT1-051")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-051")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-051")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 3 memory as a 4000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-051", as: "reppamon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reppamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
  });

  it("digivolves from a yellow level 3 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [{ card: "BT1-051", as: "reppamon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("reppamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("reppamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-050"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a red level 3 despite matching the level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-051", as: "reppamon" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("reppamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
