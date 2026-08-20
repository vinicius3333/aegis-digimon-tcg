import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-029.js";

describe("EX9-029", () => {
  it("has Training and once-per-turn attacks or digivolutions add the top security card after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }));
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "addTop", postCostCondition: { kind: "securityAtMostSelfFaceDownDigivolutionCards" }, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
    }
  });
  it("inherits once-per-turn -2000 DP against an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] }));
});
