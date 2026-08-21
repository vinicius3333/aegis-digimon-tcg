import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-07.js";

describe("ST19-07 Tobucatmon", () => {
  it("has Jamming and inherited Barrier in the catalog", () => {
    expect(getCardDefinition("ST19-07")).toMatchObject({
      effectText: "＜Jamming＞.",
      inheritedEffectText: "＜Barrier＞.",
    });
  });

});
