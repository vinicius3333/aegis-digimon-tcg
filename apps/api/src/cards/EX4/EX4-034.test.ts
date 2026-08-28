import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-034.js";

describe("EX4-034 Lopmon", () => {
  it("reveals four and adds a green two-color card plus Shu-Chong Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [
        { filter: { multicolor: true, colorCount: 2, colors: ["Green"] } },
        { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Shu-Chong Wong"] }] } },
      ],
      rest: "deckBottom",
      mandatory: true,
    });
  });
  it("may digivolve itself from hand with a two-cost reduction when suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          actions: [{ kind: "Digivolve", costDelta: -2, from: ["hand"], optional: true }],
        },
      ],
    });
  });
});
