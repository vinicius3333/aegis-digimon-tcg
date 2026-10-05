import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Agumon", "Gabumon"],
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
      ],
    },
    {
      trigger: "YourTurn",
      condition: { kind: "phaseIs", phase: "Main", raw: "[Main]" },
      description:
        "[Main] When digivolving one of your Digimon into a Digimon card in your hand with [Garurumon], [Omnimon], or [Greymon] in its name (other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon]), you may suspend this Tamer to reduce the memory cost of the digivolution by 1.",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
          into: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon", "Omnimon", "Greymon"],
                match: "name",
              },
            ],
            excludeNameOrTrait: [
              { tokens: ["DoruGreymon"], match: "nameExact" },
              { tokens: ["BurningGreymon"], match: "nameExact" },
              { tokens: ["DexDoruGreymon"], match: "nameExact" },
            ],
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          optional: true,
          raw: "When one of your Digimon digivolves into a Digimon card with [Garurumon], [Omnimon], or [Greymon] in its name, you may suspend this Tamer to reduce the digivolution cost by 1.",
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-092", compiled);
