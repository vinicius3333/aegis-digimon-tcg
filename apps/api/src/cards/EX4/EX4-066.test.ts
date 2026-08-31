import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
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

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-066");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-066");
});
