// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
      isSecurity: true,
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 6,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Link",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          recipient: {
            filter: { controller: "mine", kind: ["Digimon"] },
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
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["TS"], cost: 3 }],
};

registerIrCard("BT24-097", compiled);
