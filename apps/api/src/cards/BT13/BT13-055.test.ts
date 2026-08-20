import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-055.js";

describe("BT13-055 Lamortmon", () => {
  it("uses hand digivolution cost 3 and trashes opponent security on inherited battle deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [expect.objectContaining({ kind: "Digivolve", costOverride: 3, ignoreRequirements: true, additionalCosts: [expect.objectContaining({ kind: "place" })] })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" })] })] });
  });
});
