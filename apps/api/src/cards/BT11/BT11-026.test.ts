import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-026.js";
describe("BT11-026 Hyogamon", () => {
  it("matches the complete vanilla catalog contract and IR", () => {
    const definition = getCardDefinition("BT11-026");
    expect(definition).toMatchObject({
      cardId: "BT11-026",
      nameEn: "Hyogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 1 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Ice-Snow"],
    });
    expect(definition).not.toHaveProperty("effectText");
    expect(definition).not.toHaveProperty("inheritedEffectText");
    expect(definition).not.toHaveProperty("securityEffectText");
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT11-026")).toBeDefined();
  });

  it("evolves from blue level 3 for 1 and retains the base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-020", as: "base" }], hand: [{ card: "BT11-026", as: "hyogamon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hyogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-026");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT11-020"]);
  });

  it("plays for 5 with no triggered side effects", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT11-026", as: "hyogamon" }] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hyogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(5000);
  });
});
