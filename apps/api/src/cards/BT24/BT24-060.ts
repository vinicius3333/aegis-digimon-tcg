// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT24-060 (Hisyaryumon).
// [When Attacking]: RevealAdd top 3 — may digivolve into a [DigiPolice]/[SEEKERS] Digimon
//   among the revealed cards without cost; return the rest to top OR bottom (choice).
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
          digivolveOption: {
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DigiPolice", "SEEKERS"],
                  match: "trait",
                },
              ],
            },
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            payCost: false,
            optional: true,
          },
          add: [],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: {
            isSelfRef: true,
          },
          addedDigivolutionCardFilter: {
            kind: ["Tamer"],
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
            kind: "playFromDigivolutionCards",
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
            hostTarget: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by playing 1 [DigiPolice] or [SEEKERS] trait Tamer card from this Digimon's digivolution cards without paying the cost",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
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
