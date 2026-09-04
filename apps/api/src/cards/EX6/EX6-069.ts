// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
            },
            count: 1,
          },
          underFilter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
            zone: "breeding",
          },
          from: ["hand", "trash"],
          position: "bottom",
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          delayArmedIntrinsic: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    zone: "breeding",
                    nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
                  },
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              source: "breeding",
            },
          ],
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("EX6-069", compiled);
