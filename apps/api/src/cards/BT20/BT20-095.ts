import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ERRATA (2025-04-18): The [All Turns] Digivolve cost was updated.
// Before errata: "By moving your level 3 or higher [Chronicle] trait Digimon from breeding area..."
// After errata:  "By moving your level 3 or higher Digimon from the breeding area..."
// The [Chronicle] trait restriction on the MOVING Digimon is removed; only the destination
// card (digivolve into) must still be a [Chronicle] trait Digimon card.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckTopOrBottom",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                fromSelectionRef: "fellowshipMoved",
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
              },
              payCost: false,
              from: ["hand", "trash"],
              optional: true,
              cost: {
                kind: "moveToBattleArea",
                target: {
                  filter: {
                    zone: "breeding",
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "gte", value: 3 },
                  },
                  count: 1,
                  bindAs: "fellowshipMoved",
                },
                raw: "By moving your level 3 or higher Digimon from the breeding area to the battle area",
              },
              abortOnDecline: true,
            },
          ],
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
              playCostLte: 5,
              nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-095", compiled);
