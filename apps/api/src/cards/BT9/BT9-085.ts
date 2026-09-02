import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Start of Your Main Phase]: gain 1 memory if YOU have 8+ cards in hand;
// gain 1 memory if YOUR OPPONENT has 8+ cards in hand. KB Q1888: both independent.
// Conditions use zoneCount (hand) for each player.
// [Your Turn]: when one of your blue or red Digimon becomes unsuspended, you MAY
// suspend this Tamer to return 1 opponent level 3 Digimon to hand.
// KB Q1889: also activates during unsuspend phase.
// sourceFilter: controller:mine, colors:[Red,Blue] — confirms "your blue or red Digimon."
// The Return action has a suspend cost (pay by suspending this Tamer); optional:true on Return.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "gte",
            value: 8,
            raw: "you have 8 or more cards in hand",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 8,
            raw: "your opponent has 8 or more cards in hand",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Red", "Blue"],
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levels: [3],
                },
                count: 1,
              },
              to: "hand",
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

registerIrCard("BT9-085", compiled);
