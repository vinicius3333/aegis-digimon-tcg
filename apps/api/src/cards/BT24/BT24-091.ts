// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT24-091 "Tidal Stream". The engine's generic return-result
// binding is not available to card conditions, so the unsuspend leg uses the
// post-resolution equivalent (the opponent has no Digimon remaining).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon", "Tamer"],
                  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "breeding",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                },
              },
            ],
            raw: "you have an [TS] trait Digimon or Tamer on the field",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
          to: "hand",
          bindResultAs: "returnedLowest",
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          condition: {
            kind: "bindingExists",
            ref: "returnedLowest",
            raw: "this effect returned",
          },
        },
        {
          kind: "Link",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
            count: 1,
          },
          allowBreedingRecipient: true,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isLinked: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["TS"], cost: 3 }],
};

registerIrCard("BT24-091", compiled);
