import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-001.js";

describe("EX5-001 Sunmon", () => {
  it("once per turn may digivolve itself from hand when an effect adds its top card to its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
  });
});
