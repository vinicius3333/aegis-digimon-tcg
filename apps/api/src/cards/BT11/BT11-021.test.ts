import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-021.js";

describe("BT11-021 SnowGoblimon", () => {
  it("matches the complete vanilla catalog contract and IR", () => {
    const definition = getCardDefinition("BT11-021");
    expect(definition).toMatchObject({
      cardId: "BT11-021",
      nameEn: "SnowGoblimon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Demon"],
    });
    expect(definition).not.toHaveProperty("effectText");
    expect(definition).not.toHaveProperty("inheritedEffectText");
    expect(definition).not.toHaveProperty("securityEffectText");
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT11-021")).toBeDefined();
  });

  it("evolves from blue level 2 for 0 and retains the base as a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-002", as: "base" }], hand: [{ card: "BT11-021", as: "snow" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snow").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-021");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT11-002"]);
  });

  it("plays for exactly 3 memory with no triggered side effects", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT11-021", as: "snow" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snow").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(4000);
  });
});
