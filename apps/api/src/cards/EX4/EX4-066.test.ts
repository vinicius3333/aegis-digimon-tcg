import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-066.js";

describe("EX4-066 Adze Beast Blade and Shining Dragon Bullet", () => {
  it("offers the BlitzGreymon/CresGarurumon modal digivolutions", () => {
    const modal = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0] as {
      kind?: string;
      options?: unknown[][];
    };
    expect(modal.kind).toBe("Modal");
    expect(modal.options).toMatchObject([
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "name", tokens: ["BlitzGreymon"] }] } }],
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "name", tokens: ["CresGarurumon"] }] } }],
    ]);
  });
  it("has Security activation", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
    });
  });
});
