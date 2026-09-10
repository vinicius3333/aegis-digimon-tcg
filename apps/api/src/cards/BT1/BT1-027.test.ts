import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-027.js";

describe("BT1-027 Armadillomon", () => {
  it("matches the catalog and has complete empty IR", () => {
    expect(getCardDefinition("BT1-027")).toMatchObject({
      cardId: "BT1-027",
      nameEn: "Armadillomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 2,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 1 }],
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Mammal"],
    });
    expect(getCardDefinition("BT1-027")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-027")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-027")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 2 memory as a 4000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-027", as: "armadillomon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
  });

  it("digivolves from a blue level 2 for 1 memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT1-027", as: "armadillomon" }],
        deck: [{ card: "BT1-028", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("armadillomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-027", as: "armadillomon" }] } });
    s.state.memory = -10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("rejects evolution from a red level 2", () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "base" }, hand: [{ card: "BT1-027", as: "armadillomon" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
