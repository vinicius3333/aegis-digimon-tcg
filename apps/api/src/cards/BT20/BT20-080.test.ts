import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-080.js";

describe("BT20-080 Fenriloogamon", () => {
  it("has Scapegoat and may play a level 4 or lower SoC/SEEKERS Digimon from trash on digivolving", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited && effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Scapegoat" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("reactivates its When Digivolving effect and optionally attacks when a Tamer is placed under it", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          triggerFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
            { kind: "Attack", optional: true, attackPlayer: true },
          ],
        },
      ],
    });
  });

  it("inherits once-per-turn top-security trash after an opponent Digimon deletion", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Trash",
              condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] },
              target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
