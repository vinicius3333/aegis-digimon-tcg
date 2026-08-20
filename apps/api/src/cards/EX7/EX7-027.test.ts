import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-027.js";

describe("EX7-027", () => {
  it("has Puppet Overclock and plays a level 3 Puppet from hand when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({ keyword: "Overclock" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } });
  });
  it("inherits a once-per-turn leave-play replacement", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] }));
});
