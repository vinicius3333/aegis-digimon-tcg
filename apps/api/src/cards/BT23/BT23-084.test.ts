import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-084.js";

describe("BT23-084 Erika Mishima", () => {
  it("gains memory when a CS Digimon is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
  });

  it("pays by suspending this Tamer and returning a Hudie Digimon, then plays a level 3 CS Digimon into an empty breeding area", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      breeding: true,
      requiresEmpty: "breedingArea",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
          { kind: "return", target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } } },
        ],
      },
    });
    expect(action.target.filter.levels).toEqual([3]);
    expect(action.target.filter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);
  });

  it("grants Alliance only to this card when it is an inherited Hudiemon/Eater card", () => {
    const aura = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(aura).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
      // Structured gate — a "raw" kind evaluates as unmet, so the Aura would never grant.
      while: { kind: "anyOf" },
    });
  });
});
