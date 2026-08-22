import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-066.js";

describe("BT26-066 Salamon", () => {
  it("preserves normal evolution requirements and both Titan trash-digivolve windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "StartOfYourMainPhase", actions: [expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: true, costDelta: -2, optional: true, condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 } })] }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenHandTrashed", actions: [expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: true, costDelta: -1, optional: true })] }] }),
    ]));
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });
});
