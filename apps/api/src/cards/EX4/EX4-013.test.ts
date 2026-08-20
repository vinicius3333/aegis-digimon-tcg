import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-013.js";

describe("EX4-013 MedievalGallantmon", () => {
  it("plays from security without cost and schedules a return to hand at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions).toEqual([
      expect.objectContaining({ kind: "PlayWithoutCost", from: ["security"], payCost: false }),
      expect.objectContaining({ kind: "Return", to: "hand", scheduling: "endOfTurn" }),
    ]);
  });
  it("falls back to suspending an opponent Digimon when the 6000 DP deletion fails", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 } });
      expect(actions[1]).toMatchObject({ kind: "Suspend", preventUnsuspend: "opponentNextUnsuspendPhase", condition: { kind: "ifThisEffectDidNotDelete" } });
    }
  });
});
