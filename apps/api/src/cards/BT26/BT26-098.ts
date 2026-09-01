// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const lalamon = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Lalamon"], match: "nameExact" }],
};
const sunflowmon = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Sunflowmon"], match: "nameExact" }],
};
const lilamon = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Lilamon"], match: "nameExact" }],
};
const rosemon = {
  controller: "mine",
  zone: "hand",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Rosemon"], match: "nameExact" }],
};
const securityPlayable = {
  controller: "mine",
  zone: ["hand", "trash"],
  kind: ["Digimon", "Tamer"],
  orFilters: [
    { nameOrTrait: [{ tokens: ["Lalamon"], match: "nameExact" }] },
    { nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "nameExact" }] },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "payCost",
            cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
          },
          amount: { kind: "fixed", value: 2 },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "place",
                target: { filter: sunflowmon, count: 1, from: ["trash"] },
                destination: "digivolutionStack",
                host: { filter: lalamon, count: 1 },
                bindHostAs: "lalamonHost",
                position: "bottom",
              },
              {
                kind: "place",
                target: { filter: lilamon, count: 1, from: ["trash"] },
                destination: "digivolutionStack",
                host: { filter: { boundRef: "lalamonHost" }, count: 1 },
                position: "bottom",
              },
            ],
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: { filter: lalamon, count: 1, fromSelectionRef: "lalamonHost" },
              into: { filter: rosemon, count: 1 },
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
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
          target: { filter: securityPlayable, count: 1 },
          from: ["hand", "trash"],
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

registerIrCard("BT26-098", compiled);
