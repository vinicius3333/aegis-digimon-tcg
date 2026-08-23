import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-015.js";

describe("EX7-015 Otamamon", () => {
  it("permanently restricts play-cost reduction", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictCostReduction", seat: "any", costType: "play", duration: "permanent" }],
    }));
});
