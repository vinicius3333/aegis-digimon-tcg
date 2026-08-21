import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-193.js";

describe("P-193 The Wicked God Emerges!", () => {
  it("gates Draw 2 and battle-area placement behind trashing a Composite or Wicked God card", () => {
    expect(runtimeCompiledCard("P-193")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Draw", controller: "mine", amount: 2, cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }] } } }, abortOnDecline: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("delays a Wicked God play behind deleting your Millenniummon and activates Main from Security", () => {
    const card = runtimeCompiledCard("P-193")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, cost: { kind: "deleteOwn", target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Millenniummon"], match: "name" }] } } }, target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }] } } }],
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
