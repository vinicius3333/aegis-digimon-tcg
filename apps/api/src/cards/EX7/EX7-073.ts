// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "text",
              },
            ],
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { isSelfRef: true },
            isSelf: true,
            bindAs: "paidBeelstarmonHost",
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
            },
            raw: "By trashing 2 cards with the [Three Musketeers] trait in this Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" }, count: 1 },
        },
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          amount: 1,
          toTop: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { isSelfRef: true },
            isSelf: true,
            bindAs: "paidBeelstarmonHost",
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
            },
            raw: "By trashing 2 cards with the [Three Musketeers] trait in this Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" }, count: 1 },
        },
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          amount: 1,
          toTop: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Three Musketeers"],
      cost: 1,
      isAlternate: true,
      excludeTraits: ["X Antibody"],
    },
  ],
};

registerIrCard("EX7-073", compiled);
