import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-035.js";

describe("EX7-035", () => {
  it("suspends an opposing Digimon and prevents it from unsuspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }]);
  });
  it("has Dinosaur as a rule trait and inherits trashing the opponent's top security after a battle deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Dinosaur"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] });
  });
});
