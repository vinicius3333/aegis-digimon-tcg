// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-084 Davis Motomiya & Ken Ichijoji (Tamer)
// [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
// [All Turns] When one of your level 5 or higher Digimon with the [Free] trait would
//   be deleted in battle, by suspending this Tamer, you may play 1 level 4 or lower
//   Digimon card from that Digimon's digivolution cards without paying the cost.
// [End of Your Turn] 1 of your Digimon with the [Free] trait may attack an opponent's
//   Digimon.
// [Security] Play this card without paying its cost.
//
// KB Q2863: you can activate the [All Turns] effect even if you have no valid level 4
//   or lower Digimon cards in the digivolution cards (the cost can still be paid).
// KB Q2865: the [End of Your Turn] Digimon must not be in a state where it can't attack
//   (e.g. suspended) to be used.
// KB Q2866: two copies of this Tamer = both effects trigger, but only 1 attack can
//   happen (a new attack cannot be declared during an attack).
//
// [All Turns] Replacement fires only on battle deletion (leaveCause:"battle").
// The play from digivolution cards is optional (Q2863 confirms it can activate even
// without a valid target).
// [End of Your Turn] Attack uses the Attack kind with optional:true and a filter for
// [Free] trait Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "battle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                  zone: "digivolutionCards",
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Free"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-084", compiled);
