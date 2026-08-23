// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT20-100 (The Last Guardian).
// Fixes:
// 1. AllTurns Replacement: the GainKeyword action was spurious — <Delay> is not a
//    sub-action within the replacement; it is the delay-activation keyword on the
//    AllTurns effect block itself.
// 2. AllTurns Replacement: restructured as a single Replacement with mode:"prevent"
//    and sourceFilter matching Omnimon Digimon in battle area that would leave.
//    The "Prevent" action kind does not exist in the interpreter — the prevention is
//    encoded as mode:"prevent" on the Replacement itself.
// 3. leaveCause not restricted to otherThanBattle per text (text says "would leave the
//    battle area" with no battle exclusion); the <Delay> mechanism means this fires from
//    the delay zone — all leave-play triggers fire, prevention selects 1 Digimon.
// 4. Security PlaceInBattleAreaSelf is mandatory (text: "Then, place this card");
//    optional:true removed from that action (only the PlayWithoutCost is optional).
// KB Q4905 confirms the AllTurns triggers simultaneously with other leave-prevention
// effects and the player chooses activation order.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Cool Boy"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Royal Knight", "X Antibody"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Omnimon"],
                match: "name",
              },
            ],
          },
          target: {
            filter: {
              useTriggerSource: true,
            },
            count: 1,
          },
          actions: [],
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
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Omekamon", "Cool Boy"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-100", compiled);
