import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-026.js";

describe("EX4-026 Youkomon", () => {
  it("grants Blocker on play and digivolution and is also treated as Kyubimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Kyubimon"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GrantStatic",
        grant: "keyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
  });

  it("reduces an opposing Digimon by 2000 when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000 }],
        },
      ],
    });
  });

  it("requires the exact Renamon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Renamon"], cost: 2 }]);
  });
});
