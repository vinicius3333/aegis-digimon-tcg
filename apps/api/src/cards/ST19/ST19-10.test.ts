import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-10.js";

describe("ST19-10 ExTyrannomon", () => {
  it("matches the alternate digivolution, DigiXros, Armor Purge, and inherited Barrier text", () => {
    expect(getCardDefinition("ST19-10")).toMatchObject({
      effectText: expect.stringContaining("＜Armor Purge＞"),
      inheritedEffectText: "＜Barrier＞.",
      evoCosts: expect.arrayContaining([
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ]),
    });
  });
});
