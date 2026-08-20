import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-031.js";

describe("EX8-031", () => {
  it("returns a Plug-In Option from trash on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: 1 } });
  });
  it("inherits a once-per-turn -2000 DP effect after using an Option costing 2 or more", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] }] }));
});
