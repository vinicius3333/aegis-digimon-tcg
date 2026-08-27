// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      sharedUseKey: "main-digivolve",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
            from: ["hand"],
            count: 5,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          order: "any",
          optional: true,
          trackCount: "bt7KojiHybridCount",
        },
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["MagnaGarurumon"], match: "name" }],
            upTo: true,
          },
          from: ["hand"],
          payCost: true,
          virtualBase: { level: 5, colors: ["Blue"] },
          condition: { kind: "namedCountAtLeast", countSource: "bt7KojiHybridCount", count: 5 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          actions: [
            { kind: "GainMemory", amount: 1 },
            {
              kind: "Restrict",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              restriction: "cantBeBlocked",
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-087", compiled);
