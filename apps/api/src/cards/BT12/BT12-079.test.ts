import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-079.js";

describe("BT12-079 Jokermon", () => {
  it("has no printed effects and keeps its card definition", () => {
    expect(getCardDefinition("BT12-079")).toMatchObject({
      cardId: "BT12-079",
      nameEn: "Jokermon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Wizard"],
    });
    expect(getCompiledCard("BT12-079")).toMatchObject({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT12-079")?.cardId).toBe("BT12-079");
  });
});
