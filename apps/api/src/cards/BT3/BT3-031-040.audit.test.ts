import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT3-031.js";
import "./BT3-033.js";
import "./BT3-034.js";
import "./BT3-035.js";
import "./BT3-036.js";
import "./BT3-039.js";
import "./BT3-040.js";

const EFFECT_CARD_IDS = ["BT3-031", "BT3-033", "BT3-034", "BT3-035", "BT3-036", "BT3-039", "BT3-040"] as const;

describe("BT3-031 through BT3-040 IR coverage", () => {
  it("registers every effect-bearing range card through complete compiled IR", () => {
    for (const cardId of EFFECT_CARD_IDS) {
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(runtimeCompiledCard(cardId), `${cardId} runtime IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains the printed cost, security, inherited, and turn-boundary contracts", () => {
    expect(runtimeCompiledCard("BT3-031")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            expect.objectContaining({
              kind: "CostModifier",
              costType: "digivolve",
              mode: "reduce",
              amount: 2,
              handResident: true,
              sourceFilter: { nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "name" }] },
            }),
          ],
        }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Jamming" }] }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [{ kind: "Unsuspend", target: { count: "all", filter: { keywords: ["Jamming"] } } }],
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-033")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: -1000, duration: "forTheTurn" }],
    });
    expect(runtimeCompiledCard("BT3-034")?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "lookAndMayAddToHand",
          controller: "mine",
          ifAddedToHand: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
    expect(runtimeCompiledCard("BT3-035")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: -1000, duration: "forTheTurn" }],
    });
    expect(runtimeCompiledCard("BT3-036")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
    });
    expect(runtimeCompiledCard("BT3-039")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 } }],
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["hand"],
              optional: true,
              condition: { kind: "zoneCount", zone: "security", op: "lte", value: 3 },
            }),
          ],
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-040")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [{ kind: "GrantStatic", grant: "color", tokens: ["Blue"], duration: "forTheTurn" }],
        }),
        expect.objectContaining({
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "Aura",
              target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } },
              effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: -1 } },
            },
          ],
        }),
      ]),
    );
  });
});
