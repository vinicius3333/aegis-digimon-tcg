// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q4267: digivolve from Shoutmon (play cost ≤4) OR Dorulumon (play cost ≤4) for cost 0.
// [DigiXros -1]: requires 1 Shoutmon AND 1 Dorulumon as the two Xros materials.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "forTheTurn",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart"],
                    match: "trait",
                  },
                ],
                zone: "digivolutionCards",
              },
              count: 1,
            },
            from: ["digivolutionCards"],
            fromHost: "self",
            raw: "by placing 1 Digimon card with the [Xros Heart] trait in this Digimon's digivolution cards under 1 of your Tamers",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "name",
          tokens: ["Shoutmon", "Dorulumon"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Shoutmon"],
      playCostLte: 4,
      cost: 0,
      isAlternate: true,
    },
    {
      names: ["Dorulumon"],
      playCostLte: 4,
      cost: 0,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Shoutmon"],
        },
      ],
      count: 1,
    },
    {
      materials: [
        {
          names: ["Dorulumon"],
        },
      ],
      count: 1,
    },
  ],
};

registerIrCard("P-152", compiled);
