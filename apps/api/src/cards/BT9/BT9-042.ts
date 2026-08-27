// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-042 Raijinmon
// effectText:
//   [Hand][Main] If you have a Digimon in play with [Justimon] or [Raidenmon] in its name,
//     you may pay 1 memory to place this card under that Digimon as its bottom digivolution card.
//   [When Digivolving] You may trash 1 Digimon card with [Machine] or [Cyborg] in its traits
//     in your hand to have 1 of your opponent's Digimon get -4000 DP for the turn.
// inheritedEffectText:
//   [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.
//
// Fixes from audit:
// 1. [Hand][Main] is ONE effect from hand during the main phase — single "Hand" trigger.
//    (Having both Hand and Main triggers caused double-firing.)
// 2. [When Digivolving] trash is a cost for the DP reduction: Trash is optional with
//    abortOnDecline:true so declining prevents the ModifyDP from executing.
// 3. Added missing [When Attacking] inherited effect.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Hand",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Justimon", "Raidenmon"],
                match: "name",
              },
            ],
          },
          position: "bottom",
          payCost: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Justimon", "Raidenmon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon in play with [Justimon] or [Raidenmon] in its name",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Machine", "Cyborg"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-042", compiled);
