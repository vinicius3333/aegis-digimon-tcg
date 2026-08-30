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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Eosmon"],
                  match: "name",
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
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Eosmon"],
                  match: "name",
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
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Eosmon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "SelectBind",
              target: { sourceRef: "triggerSubject", filter: {}, count: 1, bindAs: "playedEosmon" },
            },
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  relativeTo: { attr: "dp", op: "lte", selectionRef: "playedEosmon" },
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Eosmon"],
                  match: "name",
                },
              ],
            },
            count: "all",
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "there is a Tamer",
          },
          scaling: {
            per: 1,
            filter: {
              controller: "any",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Eosmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-076", compiled);
