import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["SoC"],
                  match: "trait",
                },
              ],
            },
            raw: "a Tamer card with the [SoC] trait is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["DoruGreymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["SoC"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT16-064", compiled);
export { compiled };
