import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
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
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Royal Knight] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "chosen",
          },
        },
        {
          kind: "Unsuspend",
          target: {
            fromSelectionRef: "chosen",
            filter: {},
            count: 1,
          },
        },
        {
          kind: "ActivateForeignEffect",
          zone: "battleArea",
          fromTriggers: ["WhenDigivolving"],
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            boundRef: "chosen",
            nameOrTrait: [{ tokens: ["Jesmon GX"], match: "nameExact" }],
          },
          count: 1,
          useLenderAsSource: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
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

registerIrCard("BT10-110", compiled);
