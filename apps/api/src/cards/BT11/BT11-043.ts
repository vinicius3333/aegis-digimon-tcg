import type { CompiledCard, Condition, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grant = {
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } satisfies Target,
  grant: { dp: 3000, color: "white", originalName: "Sukamon" },
  duration: "untilOpponentTurnEnd",
  condition: {
    kind: "anyOf",
    conditions: [
      { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 16 },
      { kind: "selfHasMinTrash", count: 3, filter: { nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] } },
    ],
    raw: "your opponent has 16 or more cards in their trash or you have 3 or more [Sukamon] in your trash",
  },
} satisfies {
  target: Target;
  grant: { dp: number; color: string; originalName: string };
  duration: "untilOpponentTurnEnd";
  condition: Condition;
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "GrantStatic", ...grant }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "GrantStatic", ...grant }] },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              // "in play" has no controller qualifier: count both players' other Sukamon-named Digimon.
              controller: "any",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "any",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
                  },
                  count: 1,
                },
                raw: "by deleting 1 other Digimon with [Sukamon] in its name",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }],
};
registerIrCard("BT11-043", compiled);
