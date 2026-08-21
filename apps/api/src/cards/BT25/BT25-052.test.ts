import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-052.js";

describe("BT25-052 Logimon", () => {
  it("registers the App Fusion card with its link and Kazuki & Itsuki triggers", () => {
    expect(getCardDefinition("BT25-052")).toMatchObject({ nameEn: "Logimon", level: 4, playCost: 5, types: ["Login"] });
    const module = getEffectModule("BT25-052");
    expect(module?.cardId).toBe("BT25-052");
    expect(module?.effectsForTiming).toBeTypeOf("function");
  });
});
