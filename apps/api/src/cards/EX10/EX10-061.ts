import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5783: if only 1 face-up Dark Masters card in security, can place just that 1.
// KB Q5784: if 2+ with different names, must place ALL distinct-named ones (mandatory).
// KB Q5785: same logic for the On Play / WhenDigivolving played cards.
// KB Q5786: if 2+ with different names in digivolution cards, must play all distinct-named ones.
// KB Q5741: the Digimon played by this effect are deleted at end of the turn.
// KB Q5742: end-of-turn effect and the deletion are simultaneous; turn player chooses order.
//
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amountPerPlaced: 4,
              raw: "reduce the play cost by 4 for each card placed",
            },
          ],
          cost: {
            kind: "place",
            optional: true,
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                faceUp: true,
                nameOrTrait: [
                  {
                    tokens: ["Dark Masters"],
                    match: "trait",
                  },
                ],
              },
              count: "all",
              distinctNames: true,
            },
            underFilter: {
              isSelfRef: true,
            },
            raw: "by placing 1 of each face-up [Dark Masters] trait card with different names from your security stack under this card, reduce the play cost by 4 for each card placed",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              source: "digivolutionCards",
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
            distinctNames: true,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
        {
          // "At turn end, delete the Digimon this effect played" (KB Q5741/Q5742). `DelayedDelete`
          // arms the engine's turn-end self-delete watcher on EVERY permanent the preceding
          // PlayWithoutCost produced (ctx.lastPlayedPermanentIds) — the wired counterpart of the
          // never-read `playedByThisEffect` filter this action used to carry, which matched every
          // permanent on the board. Nothing played => nothing armed, so the old `ifThisEffectActed`
          // gate is implicit. documented behavior (OnEndTurn delete of `playedPermanents`).
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              source: "digivolutionCards",
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
            distinctNames: true,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
        {
          // "At turn end, delete the Digimon this effect played" (KB Q5741/Q5742). `DelayedDelete`
          // arms the engine's turn-end self-delete watcher on EVERY permanent the preceding
          // PlayWithoutCost produced (ctx.lastPlayedPermanentIds) — the wired counterpart of the
          // never-read `playedByThisEffect` filter this action used to carry, which matched every
          // permanent on the board. Nothing played => nothing armed, so the old `ifThisEffectActed`
          // gate is implicit. documented behavior (OnEndTurn delete of `playedPermanents`).
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Dark Masters"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-061", compiled);

export { compiled };
