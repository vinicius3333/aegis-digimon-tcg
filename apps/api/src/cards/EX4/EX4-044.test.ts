import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-044.js";

describe("EX4-044 Greymon", () => {
  it("may digivolve another own Digimon into a level six or lower Garurumon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costDelta: -2,
      optional: true,
      target: { filter: { controller: "mine", excludeSelf: true } },
      into: {
        filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] },
      },
    });
  });
  it("has inherited Reboot", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-044");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-044");
});
