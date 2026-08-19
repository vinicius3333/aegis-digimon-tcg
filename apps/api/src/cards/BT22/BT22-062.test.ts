import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-062.js";

describe("BT22-062 MetalTyrannomon (X Antibody)", () => {
  it("requires a non-X Antibody Tyrannomon and gates the digivolving restriction on the stack", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([
      {
        level: 5,
        names: ["Tyrannomon"],
        excludeTraits: ["X Antibody"],
        cost: 1,
      },
    ]);

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["MetalTyrannomon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });

  it("lets the opponent optionally choose one of their Digimon to attack", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Attack",
      optional: true,
      drainTimingWindowDuringAttack: true,
      target: {
        filter: { controller: "opponent", kind: ["Digimon"] },
        count: 1,
        chooser: "opponent",
      },
    });
  });
});
