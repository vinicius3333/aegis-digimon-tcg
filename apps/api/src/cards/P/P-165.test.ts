import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-165.js";

describe("P-165 ShoeShoemon", () => {
  it("encodes Security end-of-battle play and On Play/When Digivolving Familiar Token creation", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(compiled.effects[0]).toMatchObject({ trigger: "Security", timing: "endOfBattle", actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }] });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlayToken", tokens: ["Familiar Token"], count: 1, payCost: false },
          { kind: "DelayedDelete", timing: "endOfOpponentTurn", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }] }, count: 1 } },
        ],
      });
    }
  });

  it("encodes Familiar Token deletion as an opponent Digimon DP reduction and inherited Barrier", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "SubTrigger", event: "onDeletionOf", actions: [expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" })] })] }),
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
    ]));
  });
});
