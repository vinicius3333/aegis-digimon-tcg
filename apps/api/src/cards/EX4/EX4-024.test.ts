import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-024.js";

describe("EX4-024 Renamon", () => {
  it("prevents two opposing Digimon at 4000 DP or less from attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 2 } });
  });
  it("gains memory once per turn when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
