// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          raw: "When an effect places a Tamer card in one of your Digimon's digivolution cards, by suspending this Tamer, gain 1 memory",
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], hasTamerInDigivolutionCards: true },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }],
              },
              payCost: false,
              from: ["trash"],
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-090", compiled);
