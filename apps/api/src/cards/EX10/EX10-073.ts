// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX10-073 (Deusmon).
// runtime-effect fix: both Link actions previously defaulted to hand+digivolutionCards
// combined — letting each pull from either zone. Text specifies the first link comes "from
// your hand" and the second "from this Digimon's digivolution cards" (both [When Digivolving]
// and [End of Opponent's Turn] repeat the same two-link sequence).
// The [All Turns] SubTrigger event must stay "whenLinkTrashed" with the isSelfRef+Digimon
// sourceFilter: "whenLinkTrashed" is the only link-card-trash event the engine's `trash`
// primitive actually fires (apps/api/src/engine/effects/primitives.ts); "whenLinkCardTrashed"
// is a distinct catalog alias nothing ever fires, and dropping the sourceFilter would fire on
// ANY Digimon's link-card trash instead of only THIS Digimon's (per the printed "this
// Digimon's link cards" text).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Link",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestPlayCost",
                },
                count: 1,
              },
            },
          ],
          raw: "[All Turns] [Once Per Turn] When effects trash any of this Digimon's link cards, delete 1 of your opponent's Digimon with the lowest play cost",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Warudamon", "Cometmon"],
      cost: 0,
    },
  ],
};

registerIrCard("EX10-073", compiled);
