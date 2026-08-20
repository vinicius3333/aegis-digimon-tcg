import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-034.js";

describe("EX7-034", () => {
  it("has Vortex and suspends one Digimon when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({ keyword: "Vortex" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Suspend", target: { count: 1 } });
  });
  it("restricts that Digimon from being affected when its own Digimon was suspended", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({ kind: "Restrict", restriction: "beAffected", duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectActed" } }));
  it("inherits a once-per-turn self unsuspend on attack", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Unsuspend" }] }));
});
