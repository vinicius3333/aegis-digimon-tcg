import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-021.js";

describe("EX10-021 Belphemon: Sleep Mode", () => {
  it("proves the Rage Mode placement cost, mandatory immunity, and hand-trash suspend trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Belphemon: Rage Mode"], cost: 1, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ actions: [
        { kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", optional: true, abortOnDecline: true, cost: { kind: "place", destination: "digivolutionStack", position: "top", host: "self", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Belphemon: Rage Mode"] }] }, count: 1 } } },
        { kind: "GrantImmunity", immuneFrom: "opponentEffects", duration: "untilOpponentTurnEnd", optional: false },
      ] });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{
      kind: "Suspend", optional: true, abortOnDecline: true, target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 }, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    }] }] });
  });
});
