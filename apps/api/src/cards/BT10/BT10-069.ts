import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] Return 1 black or purple non-[DarkKnightmon (X Antibody)] Digimon card from your trash to your hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black", "Purple"],
              nameOrTrait: [
                {
                  tokens: ["DarkKnightmon (X Antibody)"],
                  match: "nameExact",
                  negate: true,
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, if [DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards, delete 1 Tamer, and unsuspend this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              kind: ["Tamer"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["DarkKnightmon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          effectTextPart:
            "Then, if [DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards, delete 1 Tamer, and unsuspend this Digimon.",
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["DarkKnightmon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[DarkKnightmon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["DarkKnightmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["DarkKnightmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-069", compiled);
