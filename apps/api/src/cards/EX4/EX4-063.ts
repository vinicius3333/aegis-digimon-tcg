import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Terriermon", "Lopmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          bindResultAs: "playedByStartEffect",
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "permanentCount",
            op: "lte",
            value: 1,
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"] },
            raw: "you have 1 or fewer Digimon in play",
          },
          optional: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              boundRef: "playedByStartEffect",
            },
            count: 1,
          },
          restriction: "digivolve",
          duration: "permanent",
        },
        { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            digivolutionStackNameOrTrait: [
              {
                tokens: ["Terriermon", "Lopmon"],
                match: "nameExact",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-063", compiled);
