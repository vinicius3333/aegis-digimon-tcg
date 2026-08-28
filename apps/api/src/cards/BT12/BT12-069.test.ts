import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-069.js";

describe("BT12-069 Footmon", () => {
  it("has no printed effects and keeps its card definition", () => {
    expect(getCardDefinition("BT12-069")).toMatchObject({
      cardId: "BT12-069",
      nameEn: "Footmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 9000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
    });
    expect(getCompiledCard("BT12-069")).toMatchObject({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT12-069")?.cardId).toBe("BT12-069");
  });
});
