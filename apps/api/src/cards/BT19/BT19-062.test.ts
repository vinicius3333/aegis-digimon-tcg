import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-062 Cyberdramon", () => {
  it("preserves placed-Option trashing, mandatory player attack gating, and keywords", () => {
    const card = runtimeCompiledCard("BT19-062");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Strikedramon"], cost: 3, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] },
      {
        trigger: "WhenAttacking",
        actions: [{
          kind: "Trash",
          target: { filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true }, count: 1 },
        }],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [{
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          attackPlayer: true,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", unsuspended: true, kind: ["Digimon"] } },
        }],
      },
      { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] },
    ]);
  });
});
