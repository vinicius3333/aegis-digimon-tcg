import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-093.js";

describe("BT20-093 Unleash the Dragon Gene", () => {
  it("keeps the optional reduced play and mandatory placement sequence", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("grants Delay without preventing the qualifying Digimon from leaving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).not.toHaveProperty(
      "mode",
      "prevent",
    );
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toMatchObject({
      actions: [{ kind: "DnaDigivolve", into: { nameOrTrait: [{ tokens: ["Examon"], match: "nameExact" }] } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dracomon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });
});
