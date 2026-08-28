// @ts-nocheck
// HAND-FIXED IR — the digivolution-cost reduction is active while this card is in hand.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          costType: "digivolve",
          mode: "reduce",
          amount: 2,
          handResident: true,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "permanent",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [
              {
                tokens: ["Paildramon", "Dinobeemon"],
                match: "name",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              keywords: ["Jamming"],
            },
            count: "all",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-031", compiled);
