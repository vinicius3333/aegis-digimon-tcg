// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT24-051 (Merukimon).
// Text:
//   [Digivolve] Lv.5 w/[Beastkin]/[TS] trait: Cost 3
//   When this card would be played, if there are 3 or more Digimon, reduce the play cost
//   by 5.
//   [On Play] [When Digivolving] Suspend 2 of your opponent's Digimon or Tamers. Then, 1
//   of your Digimon may get +5000 DP for the turn and attack your opponent's Digimon.
//   [When Digivolving] [When Attacking] [Once Per Turn] 1 of your Digimon may unsuspend.
//   [Your Turn] All of your [Iliad] trait Digimon gain ＜Rush＞ and ＜Piercing＞
// KB Q5641: The Digimon that gets +5000 DP must attack if possible (not optional).
// Fixes vs AUTO-GENERATED:
//   - OnPlay/WhenDigivolving: added Attack action after ModifyDP (mandatory, target same Digimon)
//   - The ModifyDP+Attack is optional as a unit (you may choose whether to buff+attack),
//     but once you choose to buff, the attack is mandatory per KB Q5641.
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
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "raw",
                raw: "there are 3 or more Digimon",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 5000,
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: false,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          attackPlayer: false,
          optional: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon got +5000 DP this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 5000,
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: false,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          attackPlayer: false,
          optional: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon got +5000 DP this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
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
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Iliad"],
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
                  tokens: ["Iliad"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Beastkin", "TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-051", compiled);
