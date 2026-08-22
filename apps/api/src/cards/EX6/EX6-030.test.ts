import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Mastemon", () => {
  it("exposes complete IR for the security search/play and DP effect", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "SearchSecurity",
    });
  });
  it("uses the top-security-card payment for Angel protection", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      cost: { kind: "trashSecurityTop" },
    });
  });
});
