import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-035.js";

describe("EX4-035 BlackGargomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "AddDPFromSuspendedCost", dpSource: { kind: "suspendedTarget" }, alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }] }] });
  });
  it("gains 2000 DP when an effect suspends it", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }] }] });
  });
});
