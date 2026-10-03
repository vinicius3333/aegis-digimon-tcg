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
              zone: ["battleArea", "breeding"],
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
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
            "[Main] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend.",
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "[Main] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend.",
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
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
              kind: "Restrict",
              target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Restrict",
              target: { filter: { controllerDefault: "opponent", kind: ["Tamer"] }, count: 1 },
              restriction: "suspend",
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
            "[Security] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend.",
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "[Security] Until your opponent's turn ends, 1 of their Digimon and 1 of their Tamers can't suspend.",
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
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

registerIrCard("BT23-092", compiled);
