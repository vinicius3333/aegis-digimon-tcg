import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              or: [{ kind: ["Tamer"] }, { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }],
            },
            raw: "you have a Tamer or a Digimon with the [Hybrid] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may return 1 Digimon card with the [Hybrid] trait or [Ten Warriors] trait from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Ten Warriors"],
                  match: "trait",
                  orPrevious: true,
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 Digimon card with the [Ten Warriors] trait or 1 Tamer card with inherited effects from your hand with the play cost reduced by 4.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              or: [
                {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Ten Warriors"],
                      match: "trait",
                    },
                  ],
                },
                {
                  controller: "mine",
                  kind: ["Tamer"],
                  hasInheritedEffects: true,
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          allowDigiXros: true,
          optional: true,
          costReduction: 4,
          raw: "play 1 Digimon card with the [Ten Warriors] trait or 1 Tamer card with inherited effects from your hand with the play cost reduced by 4",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 Tamer card with an inherited effect from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              hasInheritedEffects: true,
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-094", compiled);
