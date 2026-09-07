// Hand-authored override for BT25-075 (Vulcanusmon).
// runtime-effect fix:
// - Link target count: 2 cards (up to 2), upTo:true; KB Q6371: must have <Link> requirement.
// - DeDigivolve scaling counts all of the controller's link cards.
// - YourTurn linked watcher: own-Digimon subject gate and trigger-subject attack target.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "boardCountCompare",
            filter: {
              kind: ["Digimon"],
            },
            left: "mine",
            right: "opponent",
            op: "lt",
            raw: "you have fewer Digimon than your opponent",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              hasLinkRequirement: true,
            },
            count: 2,
            upTo: true,
          },
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "linkCards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              hasLinkRequirement: true,
            },
            count: 2,
            upTo: true,
          },
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "linkCards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "LinkMax",
            amount: 1,
            raw: "＜Link +1＞",
          },
          keywords: [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Attack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                sourceRef: "triggerSubject",
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
          raw: "When your Digimon get linked, one of them may attack.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      colors: ["Black"],
      cost: 4,
      isAlternate: false,
    },
    {
      level: 5,
      colors: ["Red"],
      cost: 4,
      isAlternate: false,
    },
    {
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-075", compiled);
