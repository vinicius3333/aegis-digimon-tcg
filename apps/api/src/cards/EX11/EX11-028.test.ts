import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-028.js";

describe("EX11-028 Galemon", () => {
  it("encodes its evolution requirement and all catalog effects", () => {
    const compiled = runtimeCompiledCard("EX11-028")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [{ kind: "Suspend", optional: true, target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } }] }),
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend", optional: true, target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } }] }),
      expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" }),
    ]));
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Digimon"] } });
  });
});
