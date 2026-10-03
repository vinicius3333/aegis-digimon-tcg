import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              zone: ["battleArea", "breeding"],
              nameOrTrait: [
                {
                  tokens: ["CS"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon or Tamer with the [CS] trait on the field",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Until your opponent's turn ends, give 1 of their Digimon ＜Security A. -1＞ and it can't activate [When Digivolving] or [When Attacking] effects.",
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "BT23094MainTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security A. -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            fromSelectionRef: "BT23094MainTarget",
            count: 1,
          },
          timings: ["whenDigivolving", "whenAttacking"],
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart: "Then, place this card in the battle area.",
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "BT23094DelayTarget",
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security A. -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "DisableTimingEffect",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                fromSelectionRef: "BT23094DelayTarget",
                count: 1,
              },
              timings: ["whenDigivolving", "whenAttacking"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] Until your opponent's turn ends, give 1 of their Digimon ＜Security A. -1＞ and it can't activate [When Digivolving] or [When Attacking] effects.",
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "BT23094SecTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security A. -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            fromSelectionRef: "BT23094SecTarget",
            count: 1,
          },
          timings: ["whenDigivolving", "whenAttacking"],
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart: "Then, place this card in the battle area.",
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-094", compiled);
