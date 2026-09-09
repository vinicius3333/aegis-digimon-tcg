import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-075 Eosmon (Ultimate)
// [Digivolve] Lv.4 [Eosmon]: Cost 3
// [On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand
//   without paying the cost. If they don't, you may play 1 white Tamer card with a
//   play cost of 4 or less from your hand without paying the cost. Then,
//   <De-Digivolve 1> 1 of your opponent's Digimon for every 2 Tamers.
// [Opponent's Turn] (inherited) When an opponent's Digimon attacks, you may switch the
//   attack target to 1 of your [Eosmon]. [Once Per Turn]
//
// KB Q2843: the De-Digivolve happens regardless of whether a Tamer was played.
// KB Q2842: the redirect may switch onto an UNSUSPENDED [Eosmon]. The printed text sets
//   no suspension restriction and §11-2-7 does not impose one on a switched target, so
//   the redirect filter matches any of your [Eosmon], suspended or unsuspended.
//
// Digivolve route: the printed line is "[Digivolve] Lv.4 [Eosmon]: Cost 3" with no
//   "in name", so the name gate is exact (namesExact), per the coordinator route
//   decision. The catalog carries no near-name "...Eosmon" card, so exact vs substring
//   is not behaviourally observable; the illegal-source negative covers a non-Eosmon base.
//
// "For every 2 Tamers": count all Tamers in play, floor(tamerCount / 2) is the number of
//   times <De-Digivolve 1> fires, each application picking 1 of the opponent's Digimon.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "they don't",
          },
          optional: true,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          scaling: {
            per: 2,
            filter: {
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "they don't",
          },
          optional: true,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          scaling: {
            per: 2,
            filter: {
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
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
                count: 1,
              },
              optional: true,
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
      level: 4,
      namesExact: ["Eosmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-075", compiled);
