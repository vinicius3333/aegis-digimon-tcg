import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "digivolve",
          duration: "permanent",
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Royal Knight"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 4,
              raw: "reduce the play cost by 4",
              optional: true,
            },
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "Further reduce it by 1",
              scaling: {
                per: 1,
                filter: {},
                unit: "digivolutionCards",
              },
            },
          ],
        },
      ],
      isBreeding: true,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          groupedEggAndPermanents: true,
          targetIsPermanent: true,
          target: {
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            },
            count: "all",
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Royal Knight"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
          raw: "When an Option card with the [Royal Knight] trait is placed in the battle area, gain 1 memory",
        },
      ],
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-007", compiled);
