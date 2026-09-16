import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Breeding] [Main] [Once Per Turn] You may play 1 Digimon card with [Negamon] in its text from your hand with the play cost reduced by 2. For each [Negamon] in your trash or your Digimon's digivolution cards, further reduce it by 1.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Negamon"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 2,
          reduceCostByScaling: {
            per: 1,
            filter: {
              zone: ["trash", "digivolutionCards"],
              controller: "mine",
              kind: ["Digimon", "DigiEgg"],
              nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
            },
            unit: "cards",
          },
          optional: true,
        },
        {
          effectTextPart: "Then, place this Digimon as the played Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            lastPlayed: true,
          },
        },
      ],
      isBreeding: true,
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "digivolve",
          duration: "permanent",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beDeleted",
          duration: "permanent",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beTrashed",
          duration: "permanent",
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Negamon"],
                      match: "text",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
          ],
          raw: "whenOpponentAttacks",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX9-005", compiled);
