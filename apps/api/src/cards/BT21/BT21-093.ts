import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-093 Raging Serpentine — manually verified against the printed card text.
// The use-cost reduction is a replacement-style cost modifier, while the
// security-removal clause arms a genuine Delay payload (rather than resolving
// the digivolution immediately when security is removed).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "reduce",
          amount: 4,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "if your opponent has 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" },
            count: 1,
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "opponent",
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
              },
              payCost: false,
              from: ["hand"],
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
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-093", compiled);
