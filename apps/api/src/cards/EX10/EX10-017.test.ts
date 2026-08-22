import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-017.js";

describe("EX10-017 Mienumon", () => {
  it("models the link-triggered Leviathan Tamer play and the all-turns suspend payoff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mirrormon", "Kabemon", "Copipemon"], cost: 0 }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{
      kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true,
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
      target: { filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ match: "trait", tokens: ["Leviathan"] }] }, count: 1 },
    }] }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [
      { kind: "Draw", amount: 1, cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"], zone: "linked" }, count: 1 } } },
      { kind: "GainMemory", amount: 1 },
    ] }] });
  });
});
