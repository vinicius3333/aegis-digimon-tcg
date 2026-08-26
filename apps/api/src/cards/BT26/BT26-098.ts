// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const lalamon = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }],
};
const sunflowmon = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Sunflowmon"], match: "name" }],
};
const lilamon = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Lilamon"], match: "name" }],
};
const rosemon = {
  controller: "mine",
  zone: "hand",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Rosemon"], match: "name" }],
};
const _aegiochusmon = { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }] };
const securityPlayable = {
  controller: "mine",
  zone: ["hand", "trash"],
  kind: ["Digimon", "Tamer"],
  orFilters: [
    { nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }] },
    { nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "name" }] },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        // The payment is owned by the wrapper, not by the CostModifier itself: a CostModifier
        // that carries its own cost is scaled by the count that cost reports, and a fixed-count
        // cost reports 0, which zeroes the reduction before it reaches the pay-time window.
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "By trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "CostModifier",
              costType: "use",
              mode: "reduce",
              amount: 2,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              handResident: true,
              duration: "permanent",
            },
          ],
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
