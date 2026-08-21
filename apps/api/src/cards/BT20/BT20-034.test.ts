import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-034.js";

describe("BT20-034 Boutmon", () => {
  it("has Fortitude, restricts one opponent Digimon after a Tamer enters the stack, and trashes security on inherited battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([{ keyword: "Fortitude", raw: "＜Fortitude＞" }]);
    const main = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main).toMatchObject({ actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { kind: ["Tamer"] }, actions: [{ kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] }] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true }, { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true }]);
  });
});
