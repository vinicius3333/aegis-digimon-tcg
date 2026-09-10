import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "attack",
          duration: "permanent",
        },
        {
          kind: "GrantImmunity",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          immuneFrom: "opponentEffects",
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "nameExact" }],
            },
            count: 1,
            from: ["hand"],
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              excludeSelf: true,
              nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
            },
            raw: "you don't have another [Mother D-Reaper] in play",
          },
          destination: {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
            },
            count: 1,
          },
          mixedSources: { battleAreaPermanents: true, hand: true },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce its play cost by 1 for each of this Digimon's digivolution cards",
              optional: true,
            },
          ],
          scaling: { per: 1, unit: "digivolutionCards" },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-007", compiled);
