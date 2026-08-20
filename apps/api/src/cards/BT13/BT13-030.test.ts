import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-030.js";

describe("BT13-030 UlforceVeedramon", () => {
  it("trashes two cards per Royal Knight or blue Tamer and returns only empty-stack Digimon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find(candidate => candidate.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true, scaling: { per: 1, unit: "cards" } });
    }
    expect(compiled.effects[2]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", actions: [expect.objectContaining({ kind: "Return", to: "hand" })] })] });
  });
});
