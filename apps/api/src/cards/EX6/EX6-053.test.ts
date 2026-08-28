import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-053.js";

describe("EX6-053 LadyDevimon", () => {
  it("has Retaliation and deletes a level 4 or lower Digimon when Mirei is present", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Retaliation");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      condition: { kind: "youHave" },
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("plays Mirei from trash only when absent and inherits conditional Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Scapegoat" } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });
});
