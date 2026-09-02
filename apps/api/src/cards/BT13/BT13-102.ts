import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play]: opponent MAY trash 1 Tamer or Option. If they don't, gain 1 memory + Draw 1.
// [Opponent's Turn]: when an EFFECT plays a Digimon (not DigiXros), by suspending this Tamer, gain 1 memory.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "opponent",
              kind: ["Tamer", "Option"],
            },
            count: 1,
            upTo: true,
          },
          chooser: "opponent",
          optional: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentDeclinedTrash",
            raw: "if they don't",
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "opponentDeclinedTrash",
            raw: "if they don't",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            kind: ["Digimon"],
            byEffect: true,
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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
            raw: "by suspending this Tamer, gain 1 memory",
          },
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

registerIrCard("BT13-102", compiled);
