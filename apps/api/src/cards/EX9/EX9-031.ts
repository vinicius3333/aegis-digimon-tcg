// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving][When Attacking] cost: trash the bottom face-down digivolution card
// of this Digimon (zone:"digivolutionCards", not isSelfRef which would target the Digimon).
// KB Q4785: trash the 1st face-down digivolution card from the bottom.
// Action: <Recovery +1 (Deck)> = SecurityManipulation op:addTop from:deck amount:1.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.3"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              scaling: {
                per: 1,
                filter: {
                  controllerDefault: "mine",
                  faceDown: true,
                },
                unit: "digivolutionCards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security A. +1＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          from: ["deck"],
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                faceDown: true,
                position: "bottom",
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          from: ["deck"],
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                faceDown: true,
                position: "bottom",
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
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
              amount: -4000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Sukamon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DM"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-031", compiled);
