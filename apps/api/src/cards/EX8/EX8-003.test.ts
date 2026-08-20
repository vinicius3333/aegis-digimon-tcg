import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-003.js";

describe("EX8-003", () => {
  it("inherits a once-per-turn attack effect that gives an opposing Digimon -2000 DP when you have another Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 }, condition: { kind: "youHave" } }] }));
  it("requires a distinct friendly Digimon for the DP reduction", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ condition: { kind: "youHave", filter: { excludeSelf: true, kind: ["Digimon"] } } }));
});
