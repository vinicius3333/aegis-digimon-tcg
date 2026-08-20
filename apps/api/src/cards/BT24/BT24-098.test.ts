import { describe, expect, it } from "vitest";
import { compiled as BT24_098 } from "./BT24-098.js";
import "../index.js";

describe("BT24-098 Invasion of the Titans", () => {
  it("draws and trashes on Main, then arms and consumes Delay correctly", () => {
    const main = BT24_098.effects?.find((entry) => entry.trigger === "Main" && entry.keywords === undefined);
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const arm = BT24_098.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(arm?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
    });
    const armAction = arm?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(armAction?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Delay" },
    });
    const delay = BT24_098.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      requiresDelayArmed: true,
      from: ["trash"],
      payCost: false,
      condition: { kind: "memoryAtLeast", value: 5, controller: "opponent" },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(BT24_098.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
            },
            count: 1,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });
});
