// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const aegiomon = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
};
const yukiTamer = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Dan Yuki"], match: "name" }],
};
const jupitermon = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Jupitermon"], match: "nameExact" }],
};
const aegiocHusmon = { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }] };
const tsSecurity = {
  controller: "mine",
  zone: "hand",
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
  playCostLte: 5,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "delta",
          amount: 1,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          handResident: true,
          duration: "permanent",
          scaling: { per: 1, unit: "security", filter: { controller: "mine" } },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: yukiTamer,
              orFilters: [
                {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Tamer"],
                  nameOrTrait: [{ tokens: ["Kanan Yuki"], match: "name" }],
                },
              ],
              count: 1,
            },
            destination: "digivolutionStack",
            host: { filter: aegiomon, count: 1 },
            bindHostAs: "aegiomonHost",
            position: "bottom",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: { filter: aegiomon, count: 1, fromSelectionRef: "aegiomonHost" },
              into: {
                filter: {
                  controller: "mine",
                  zone: ["hand", "trash"],
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Jupitermon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
            },
            // "After, you may place ... as any of your [Jupitermon]'s top digivolution card":
            // sequencing, not a consequence of the digivolution. It reads any Jupitermon the
            // controller has, so declining the evolution does not cancel it.
            {
              kind: "PlaceUnder",
              target: { filter: aegiocHusmon, count: 1 },
              underFilter: jupitermon,
              position: "top",
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: tsSecurity, count: 1 },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-097", compiled);
