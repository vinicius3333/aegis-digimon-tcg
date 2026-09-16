import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare", "Xros Heart"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              count: 1,
            },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            raw: "By placing 1 Digimon card with the [Blue Flare]/[Xros Heart] trait from your hand under any of your Tamers",
          },
          optional: true,
          raw: "gain 1 memory",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "instead",
          optional: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
            hasDigiXrosRequirements: true,
          },
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              zones: ["underTamers"],
              duration: "forTheTurn",
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
              raw: "you may place cards from under your Tamers as digivolution cards for a DigiXros",
            },
          ],
          raw: "[All Turns] When any of your [Blue Flare] trait Digimon cards with DigiXros requirements would be played, by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for a DigiXros.",
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

registerIrCard("BT19-081", compiled);
