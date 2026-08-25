// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-015 Gokuumon
// [Digivolve] Lv.4 w/[Shambala] trait: Cost 3
// <Raid>
// [On Play][When Digivolving] 1 of your opponent's Digimon gets -4000 DP until their
//   turn ends. Then, 1 of your other Digimon with the [SW] trait may gain <Alliance>
//   and attack.
// [Inherited][When Attacking][Once Per Turn] You may delete 1 of your opponent's
//   Digimon with 6000 DP or less.
//
// "may gain <Alliance> and attack": choosing the Alliance recipient is optional, but
// that same Digimon must attack if possible (Q6737).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["SW"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
          duration: "forTheTurn",
          optional: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          mandatory: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon gained Alliance",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["SW"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
          duration: "forTheTurn",
          optional: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          mandatory: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon gained Alliance",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          levelMax: 5,
          nameOrTrait: [
            { tokens: ["Gokuumon"], match: "text" },
            { tokens: ["SW"], match: "trait" },
          ],
        },
      ],
      count: 2,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("EX12-015", compiled);
