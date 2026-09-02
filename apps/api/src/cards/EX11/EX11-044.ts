// HAND-FIXED IR for EX11-044 — do not regenerate.
// Delete cost: count corrected to 3 (was 1); added superlative:highestPlayCost; fixed
// cost filter (kind:Digimon removed, zone added). AllTurns: plain PlaceUnder converted
// to SubTrigger (fires when digivolution cards are trashed); PlaceUnder corrected from
// Save form to standard form (Mineral/Rock from trash → self bottom).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  digivolutionRequirement: [],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fragment",
          amount: 3,
          raw: "＜Fragment (3)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              superlative: "highestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                // canPayCost only recognizes a stack-trash cost through filter.zone; with just
                // `from` the affordability gate fell through to its `return true` default and
                // offered the optional clause with fewer than 3 payable cards (KB Q5889: a "by"
                // cost may not be partially paid).
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 3,
            },
            raw: "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ex11-044-main-effect",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              superlative: "highestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                // canPayCost only recognizes a stack-trash cost through filter.zone; with just
                // `from` the affordability gate fell through to its `return true` default and
                // offered the optional clause with fewer than 3 payable cards (KB Q5889: a "by"
                // cost may not be partially paid).
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 3,
            },
            raw: "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ex11-044-main-effect",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              superlative: "highestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                // canPayCost only recognizes a stack-trash cost through filter.zone; with just
                // `from` the affordability gate fell through to its `return true` default and
                // offered the optional clause with fewer than 3 payable cards (KB Q5889: a "by"
                // cost may not be partially paid).
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 3,
            },
            raw: "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ex11-044-main-effect",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            isSelfRef: true,
            byEffect: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Mineral", "Rock"],
                      match: "trait",
                    },
                  ],
                },
                from: ["trash"],
                count: 3,
              },
              underFilter: {
                isSelfRef: true,
              },
              position: "bottom",
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
};

registerIrCard("EX11-044", compiled);
