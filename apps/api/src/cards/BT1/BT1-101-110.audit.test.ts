import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./BT1-101.js";
import "./BT1-102.js";
import "./BT1-103.js";
import "./BT1-104.js";
import "./BT1-105.js";
import "./BT1-106.js";
import "./BT1-107.js";
import "./BT1-108.js";
import "./BT1-109.js";
import "./BT1-110.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT1-101 through BT1-110 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT1-101",
      "BT1-102",
      "BT1-103",
      "BT1-104",
      "BT1-105",
      "BT1-106",
      "BT1-107",
      "BT1-108",
      "BT1-109",
      "BT1-110",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed triggers, target boundaries, source positions, and durations", () => {
    const howlingCrusher = card("BT1-101")!;
    expect(irNode(howlingCrusher.effects[0]?.actions[0])).toMatchObject({
      kind: "TrashDigivolution",
      amount: "all",
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: "all" },
    });
    expect(howlingCrusher.effects).toMatchObject([{ trigger: "Main" }, { trigger: "Security" }]);

    const bladeOfTheTrue = card("BT1-102")!;
    expect(bladeOfTheTrue.effects[0]?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      scaling: { per: 2, unit: "security", filter: { controller: "mine" } },
    });

    const testament = card("BT1-103")!;
    expect(testament.effects[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "Blocker" },
      duration: "untilOpponentTurnEnd",
    });
    expect(testament.effects[1]?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "AddToHandSelf" }]);

    const goldenRipper = card("BT1-104")!;
    expect(goldenRipper.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      playerScoped: true,
      triggerFilter: { controller: "mine", kind: ["Digimon"] },
      duration: "forTheTurn",
    });
    expect(irNode(goldenRipper.effects[0]?.actions[0]).actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -2000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });

    expect(card("BT1-105")!.effects[0]?.actions[0]).toMatchObject({
      kind: "SetBaseDP",
      value: 3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(card("BT1-106")!.effects[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -7000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });

    expect(card("BT1-107")!.effects).toMatchObject([
      { trigger: "Main", actions: [{ kind: "SecurityManipulation", op: "addTop", source: "deck", amount: 1 }] },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }] },
    ]);
    expect(card("BT1-108")!.effects).toMatchObject([
      { trigger: "Main", actions: [{ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }] },
      { trigger: "Security", actions: [{ kind: "Suspend" }, { kind: "AddToHandSelf" }] },
    ]);

    const smashedPotatoes = card("BT1-109")!;
    expect(smashedPotatoes.effects[0]?.actions[0]).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 4,
      duration: "forTheTurn",
      once: true,
      target: {
        filter: { zone: "battleArea", controller: "mine", kind: ["Digimon"], colors: ["Green"], levels: [5] },
      },
      into: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Green"], levels: [6] },
    });

    const flowerCannon = card("BT1-110")!;
    expect(flowerCannon.effects[0]?.actions[0]).toMatchObject({ kind: "Suspend", target: { count: 1 } });
    expect(irNode(flowerCannon.effects[1]?.actions[0])).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], excludeKeywords: ["Blocker"] },
        count: "all",
      },
    });
  });
});
