import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-029.js";

describe("BT13-029 MachGaogamon", () => {
  it("locks the attack target for the turn and unsuspends on opponent-hand additions", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "Restrict", restriction: "attackTargetChange", duration: "forTheTurn", condition: expect.objectContaining({ kind: "zoneCount", value: 8 }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" })] });
  });
});
