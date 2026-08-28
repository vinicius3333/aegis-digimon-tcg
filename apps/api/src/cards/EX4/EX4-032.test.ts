import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-032.js";

describe("EX4-032 Terriermon", () => {
  it("reveals four and adds a green two-color card plus Henry Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [
        { filter: { multicolor: true, colorCount: 2, colors: ["Green"] } },
        { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Henry Wong"] }] } },
      ],
      rest: "deckBottom",
    });
  });
  it("may digivolve itself from hand for two less when Alliance suspends your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              reduceCost: 2,
              optional: true,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });
});
