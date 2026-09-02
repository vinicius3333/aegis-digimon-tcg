import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX10-032 Proganomon
// Audit fixes (EX10 card-by-card):
//  - `into` and every `fromSelectionRef` target now carry the required `filter`/`count`. The
//    interpreter ignores `DigivolveViaPlacement.into` entirely and reads `Target.fromSelectionRef`
//    before any candidate search, so these are typing repairs with no behavior change.
//  - `placeCost.hostFilter` gained `controller: "mine"` + `kind: ["Digimon"]`. It is resolved by
//    `resolvePermanentTargets`, which scans BOTH seats without a controller, so the printed
//    "any of YOUR [Sunarizamon]" could have placed the Landramon under the opponent's copy.
//  - the "If you have [Close]" gate gained `kind: ["Digimon", "Tamer"]` (CR 16-42-3): `youHave`
//    counts every battle-area permanent, Options included, when the filter names no kind.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [
            {
              tokens: ["Close"],
              match: "name",
            },
          ],
        },
        raw: "If you have [Close]",
      },
      actions: [
        {
          kind: "DigivolveViaPlacement",
          placeCost: {
            kind: "placeFromTrash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Landramon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            destination: "digivolutionStack",
            position: "bottom",
            hostFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sunarizamon"],
                  match: "name",
                },
              ],
            },
            raw: "by placing 1 [Landramon] from your trash as any of your [Sunarizamon]'s bottom digivolution card",
          },
          into: {
            filter: { isSelfRef: true },
            count: 1,
            isSelfRef: true,
          },
          cost: 3,
          ignoreDigivolutionRequirements: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Collision",
            raw: "＜Collision＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 1,
            },
            raw: "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Collision",
            raw: "＜Collision＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 1,
            },
            raw: "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Collision",
            raw: "＜Collision＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              from: ["digivolutionCards"],
              count: 1,
            },
            raw: "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "chosen",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Mineral", "Rock"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "DeDigivolve",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 1,
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

registerIrCard("EX10-032", compiled);

export { compiled };
