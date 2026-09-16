import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
            raw: "If you have 2 or less memory",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            hasDigiXrosRequirement: true,
          },
          mode: "instead",
          optional: true,
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              zones: ["underTamers"],
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              raw: "you may place cards from under your Tamers as digivolution cards for a DigiXros",
            },
          ],
          raw: "[All Turns] When any of your [Xros Heart] trait Digimon cards with DigiXros requirements would be played, by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for a DigiXros.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-079", compiled);
