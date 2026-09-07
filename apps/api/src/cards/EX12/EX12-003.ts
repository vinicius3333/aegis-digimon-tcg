import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns] inherited: when any ME Digimon would leave play, it (the leaving Digimon)
// MUST be one of the two DNA materials ("1 of them and any of your other Digimon").
// materials.includeRef:"triggerSubject" pins the leaving Digimon as the first material;
// the player chooses 1 additional Digimon from the field. The engine hardcodes
// zone:"hand" for DnaDigivolve into.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["ME"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 2,
                includeRef: "triggerSubject",
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["ME"],
                    match: "trait",
                  },
                ],
                hasDnaDigivolutionRequirement: true,
              },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-003", compiled);
