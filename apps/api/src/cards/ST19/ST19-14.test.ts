import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-14.js";

describe("ST19-14 Arisa Kinosaki", () => {
  it("matches memory, Puppet/Token Rush, and Security play wording", () => {
    const card = getCardDefinition("ST19-14");
    expect(card.effectText).toContain("set your memory to 3");
    expect(card.effectText).toContain("gains ＜Rush＞");
    expect(card.securityEffectText).toBe("[Security] Play this card without paying the cost.");
  });
});
