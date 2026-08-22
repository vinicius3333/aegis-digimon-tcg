import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-035.js";

describe("BT20-035 Kazuchimon", () => {
  it("suspends and restricts separate opponent targets, and only activates its effect plus attack when a Tamer enters the stack", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }] });
    const reaction = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(reaction).toMatchObject({ actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { kind: ["Tamer"] }, actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving" }, { kind: "Attack", optional: true }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "SecurityManipulation", op: "addTop", source: "deck", condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] } }] }] });
  });
});
