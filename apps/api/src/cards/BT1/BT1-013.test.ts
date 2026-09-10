import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-013.js";

describe("BT1-013 Muchomon", () => {
  it("matches the catalog and has no effects", () => {
    expect(getCardDefinition("BT1-013")).toMatchObject({
      cardId: "BT1-013",
      set: "BT1",
      nameEn: "Muchomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 1 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Avian"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-013",
      nameJp: "ムーチョモン",
    });
    expect(getCardDefinition("BT1-013")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-013")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-013")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 3 memory as a 5000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-013", as: "muchomon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("muchomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 5000, currentDP: 5000 });
  });

  it("digivolves from a red level 2 for 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "BT1-013", as: "muchomon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("muchomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("muchomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 5000, currentDP: 5000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects digivolving from a green level 2", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-007", as: "base" }],
        hand: [{ card: "BT1-013", as: "muchomon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("muchomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("rejects digivolving from a red level 3 because the requirement is exactly level 2", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT1-013", as: "muchomon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("muchomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
