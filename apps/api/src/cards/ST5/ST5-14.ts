// @ts-nocheck
// Hand-authored override for ST5-14 (Tai Kamiya, Tamer).
// Fix: trigger fires specifically when the player uses <Blocker> to suspend one of
// their Digimon, not on a generic OpponentsTurn. The combat controller fires the
// "whenBlockerActivated" SubTrigger after a legal blocker is declared.
// The "you may suspend this Tamer" is a cost (kind:"suspend" on self).
// KB Q669: the Unsuspend target need not be the blocking Digimon.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBlockerActivated",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              optional: true,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "you may suspend this Tamer to unsuspend 1 of your Digimon",
              },
              abortOnDecline: true,
            },
          ],
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

registerIrCard("ST5-14", compiled);
