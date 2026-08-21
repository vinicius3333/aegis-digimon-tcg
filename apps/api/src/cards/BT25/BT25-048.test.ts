import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-048.js";

describe("BT25-048 Bearmon", () => {
  it("matches the catalog and only reduces TS digivolution from the battle area", () => {
    expect(getCardDefinition("BT25-048")).toMatchObject({
      nameEn: "Bearmon",
      level: 3,
      playCost: 3,
      types: ["Beast", "Iliad", "TS"],
      effectText: expect.stringContaining("reduce the cost by 1"),
    });
    const BT25_048 = getEffectModule("BT25-048")!;
    expect(BT25_048.effectsForTiming).toBeTypeOf("function");
    expect(BT25_048.cardId).toBe("BT25-048");
  });
});
