// Hand-fixed: inherited DnaDigivolve needs 2 materials (self + one other in play),
// into must be from hand with DNA digivolution requirement (KB Q729-731).
// [Your Turn] Replacement already correctly scoped to isSelfRef with trait filter.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Yellow"],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Archangel", "Fallen Angel"],
                match: "trait",
              },
            ],
          },
          raw: "when this Digimon would digivolve into an Archangel or Fallen Angel",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the memory cost of the digivolution by 2",
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasDnaDigivolutionRequirement: true,
              zone: "hand",
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("ST10-04", compiled);
