import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-034.js";
import "../index.js";
describe("BT26-034 Palmon", () => {
  it("compiles the conditional free hand digivolution", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, condition: { kind: "memoryAtMost", value: 4 } }] });
  });
  it("compiles the inherited once-per-turn optional opponent suspension", () => {
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend", optional: true, target: { filter: { controller: "opponent", kind: ["Digimon"] } } }] });
  });
});
