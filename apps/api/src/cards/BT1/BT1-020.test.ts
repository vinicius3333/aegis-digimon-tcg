import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT1-020.js";

describe("BT1-020 Groundramon", () => {
  it("matches the catalog and has no effects", () => {
    expect(getCardDefinition("BT1-020")).toMatchObject({
      cardId: "BT1-020",
      set: "BT1",
      nameEn: "Groundramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Earth Dragon"],
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-020",
      nameJp: "グラウンドラモン",
    });
    expect(getCardDefinition("BT1-020")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-020")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-020")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 5 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-020", as: "groundramon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves from a red level 4 for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "BT1-020", as: "groundramon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("groundramon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT1-020");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-020", as: "groundramon" }] } });
    s.state.memory = -10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundramon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("rejects evolution from a green level 4", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "base" }],
        hand: [{ card: "BT1-020", as: "groundramon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("rejects evolution from a red level 3 because the requirement is exactly level 4", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT1-020", as: "groundramon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
