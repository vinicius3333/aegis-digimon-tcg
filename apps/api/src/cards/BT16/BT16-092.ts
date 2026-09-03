import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["ExVeemon", "Stingmon"],
                  match: "name",
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Veemon", "Wormmon"],
                  match: "name",
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
