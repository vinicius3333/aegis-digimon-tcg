import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1124: security Digimon are not considered Digimon — effect doesn't activate.
// KB Q1125: deleting Digimon must be your green or blue Digimon (sourceFilter).
// whenDeletesInBattle: implies the deleting Digimon survives (battle won) and the
// deleted target is a non-security opponent Digimon.
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
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Green", "Blue"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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
              optional: true,
            },
          ],
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

registerIrCard("BT3-094", compiled);
