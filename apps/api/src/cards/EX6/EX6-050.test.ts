import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-050.js";

describe("EX6-050 Feresmon", () => {
  it("has Blocker and gains memory/trashes the opponent's hand on digivolving/deletion based on hand size", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GainMemory", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", controller: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]);
  });
  it("inherits optional opponent hand trash, or plays a purple level 3 from trash if they decline", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", controller: "opponent", optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    }));
});
