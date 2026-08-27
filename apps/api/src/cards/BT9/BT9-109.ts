// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-109 (X Antibody).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"] },
            raw: "you have a Digimon in play",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }],
      isSecurity: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Digimon"], excludeCardsNamed: ["X Antibody"] },
          position: "bottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              zone: "digivolutionCards",
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }],
            },
            count: "all",
          },
          restriction: "beTrashed",
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { controllerDefault: "mine", kind: ["Digimon"], traits: ["X Antibody"] },
          from: ["hand"],
          payCost: true,
          optional: true,
          useAlternateCost: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-109", compiled);
