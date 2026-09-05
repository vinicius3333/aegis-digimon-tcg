import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX10-055.
// Defects fixed:
// (1) OnPlay/WhenDigivolving effect was "delete all opponent Digimon" — wrong.
//     1 OPPONENT Digimon with Level <= the sacrificed Digimon's level (documented behavior).
//     Fixed using SelectBind{A = mine Digimon} + Delete{fromSelectionRef:A} (sacrifice)
//     + Delete{opp Digimon with Filter.relativeTo:{attr:'level', op:'lte', selectionRef:'A'}}.
// (2) AllTurns Replacement: count changed from 1 to "all" — KB Q5139 says the effect
//     prevents ALL matching Digimon from leaving without the player having to choose them.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      optional: true,
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "A",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: {
                attr: "level",
                op: "lte",
                selectionRef: "A",
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "A",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: {
                attr: "level",
                op: "lte",
                selectionRef: "A",
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          raw: "[All Turns] [Once Per Turn] When any of your [Bagra Army] trait Digimon would leave the battle area by effects, by trashing any 2 of this Digimon's digivolution cards, they don't leave.",
          affectsAll: true,
          leaveCause: "byEffect",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 2,
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          traits: ["Bagra Army"],
        },
      ],
      count: 2,
      costReduction: 2,
      maxMaterials: 2,
    },
  ],
};

registerIrCard("EX10-055", compiled);

export { compiled };
