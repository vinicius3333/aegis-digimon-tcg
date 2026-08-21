import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-021.js";

describe("EX5-021 Majiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("gains memory when using an Option costing at least one and as an inherited trait effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionUsed",
      fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });
});
