import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-016 Lamiamon — hand-authored IR override.
//
// [Hand][Main] places [Dimetromon] from trash under an [Elizamon], binds that host, then
// digivolves the same host into this in-hand card for cost 3 ignoring requirements.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "bt24_016_elizamon",
          },
          into: {
            isSelfRef: true,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Owen Dreadnought"],
                  match: "name",
                },
              ],
            },
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dimetromon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Elizamon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            bindHostAs: "bt24_016_elizamon",
            raw: "by placing 1 [Dimetromon] from your trash as any of your [Elizamon]'s bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "opponent",
          amount: 1,
          source: "hand",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
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
          op: "addBottom",
          controller: "opponent",
          amount: 1,
          source: "hand",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
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
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "opponent",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    value: 5000,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Reptile", "Dragonkin"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "whenSecurityRemoved",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-016", compiled);
