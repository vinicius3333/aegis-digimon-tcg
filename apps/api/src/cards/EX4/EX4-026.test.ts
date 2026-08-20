import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-026.js";

describe("EX4-026 Youkomon", () => {
  it("reduces an opposing Digimon by 2000 when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "ModifyDP", amount: -2000 }] }] });
  });
});
