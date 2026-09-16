import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] You may play 1 [ExVeemon] or [Stingmon] from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["ExVeemon", "Stingmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, 2 of your Digimon may DNA digivolve into a Digimon card in your hand. Until the end of your opponent's turn, the Digimon this effect DNA digivolved can't be deleted in battle and gains <Blocker>.",
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          payCost: true,
          optional: true,
          bindResultAs: "dnaDigivolvedByThisEffect",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              boundRef: "dnaDigivolvedByThisEffect",
            },
            count: 1,
          },
          restriction: "beDeletedInBattle",
          duration: "untilOpponentTurnEnd",
          raw: "The Digimon DNA digivolved by this effect can't be deleted in battle until the end of your opponent's turn.",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              boundRef: "dnaDigivolvedByThisEffect",
            },
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "bindingExists",
            ref: "dnaDigivolvedByThisEffect",
            raw: "if this effect DNA digivolved",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 [Veemon] or [Wormmon] from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Veemon", "Wormmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-092", compiled);
export { compiled };
