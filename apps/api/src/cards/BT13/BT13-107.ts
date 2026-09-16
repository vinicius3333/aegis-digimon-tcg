import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
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
            bindAs: "chosenDigimon",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
              relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" },
            },
            count: 1,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, by returning the top card of one of your [Leopardmon: Leopard Mode] to the hand, unsuspend all of your Digimon.",
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                zone: "battleArea",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Leopardmon: Leopard Mode"], match: "nameExact" }],
              },
              count: 1,
              topCardOnly: true,
            },
            raw: "by returning the top card of one of your [Leopardmon: Leopard Mode] to the hand",
            optional: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart: "[Security] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
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

registerIrCard("BT13-107", compiled);
