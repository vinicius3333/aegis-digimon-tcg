// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT24-060 (Hisyaryumon).
// [When Attacking]: RevealAdd top 3 — add [DigiPolice]/[SEEKERS] Digimon from revealed;
//   return rest to top OR bottom (player choice). Then digivolve into that card without cost.
// [All Turns]: SubTrigger whenAddDigivolutionCards (Tamer) → suspend 1 opp Digimon.
//   Then THIS Digimon may attack opponent's Digimon (optional).
// Inherited [All Turns]: Replacement wouldLeavePlay for [DigiPolice]/[SEEKERS] Digimon —
//   cost is PlayWithoutCost of a [DigiPolice]/[SEEKERS] Tamer from THIS Digimon's digivolution cards;
//   they don't leave (Prevent action). Q5782: affects ALL DigiPolice/SEEKERS Digimon simultaneously.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["DigiPolice", "SEEKERS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              optional: true,
            },
          ],
          rest: "deckTopOrBottom",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            fromRevealedRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["DigiPolice", "SEEKERS"],
                match: "trait",
              },
            ],
          },
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
          event: "onAddDigivolutionCards",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            addedToHost: "self",
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              kind: "Attack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              attackPlayer: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["DigiPolice", "SEEKERS"],
                match: "trait",
              },
            ],
          },
          affectsAll: true,
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
            },
          ],
          cost: {
            kind: "playWithoutCost",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["DigiPolice", "SEEKERS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            from: ["digivolutionCards"],
            fromHost: "self",
            payCost: false,
            raw: "by playing 1 [DigiPolice] or [SEEKERS] trait Tamer card from this Digimon's digivolution cards without paying the cost",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "partial",
  residual: [
    "RevealAdd rest:deckTopOrBottom (player choice) may need engine support; fromRevealedRef on Digivolve into not standard",
  ],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["DigiPolice", "SEEKERS"],
      traitsMatchAny: true,
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-060", compiled);
