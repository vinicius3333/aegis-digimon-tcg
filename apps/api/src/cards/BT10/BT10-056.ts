// Hand-authored audit fix: preserve the selected opponent binding and Lotosmon's granted effect.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "suspendedTarget",
          },
        },
        {
          kind: "Suspend",
          target: {
            fromSelectionRef: "suspendedTarget",
            filter: {},
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "suspendedTarget",
            filter: {},
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              excludeSelf: true,
              nameOrTrait: [
                {
                  tokens: ["Vegetation", "Plant", "Ancient Plant", "Carnivorous Plant", "Fairy"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          grant: "gainEffect",
          tokens: ["OnDeletionGain2MemoryAndReturn3000DP"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-056", compiled);
