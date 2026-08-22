import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-144.js";

describe("P-144 Gotsumon (X Antibody)", () => {
  it("keeps the Your Turn attack restriction when only an X Antibody card is underneath", () => {
    const effect = runtimeCompiledCard("P-144")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      actions: [{ kind: "Restrict", restriction: "attack", condition: {
        kind: "selfLacksInDigivolutionCards",
        filter: { nameOrTrait: [{ tokens: ["Gotsumon"], match: "name" }] },
      } }],
    });
    expect(JSON.stringify(effect)).not.toContain("X Antibody");
  });

  it("encodes Blocker, target-switch unsuspension, and inherited Blocker DP", () => {
    const compiled = runtimeCompiledCard("P-144")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
      expect.objectContaining({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenAttackTargetSwitched" })] }),
      expect.objectContaining({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })] }),
    ]));
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gotsumon"], cost: 0, isAlternate: true }]);
  });
});
