import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-15.js";

describe("ST19-15 Noble Family Arts", () => {
  it("matches the two-stage total-Digimon DP reduction and Security activation", () => {
    expect(getCardDefinition("ST19-15")).toMatchObject({
      effectText: expect.stringContaining("gets -6000 DP"),
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });
});
