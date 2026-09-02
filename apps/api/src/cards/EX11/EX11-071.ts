import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Bracketed card-name references are EXACT names (KB Q1231/Q1232: "[Cerberusmon]" does not
// reach "Cerberusmon: Werewolf Mode"), so the two named refs use `nameExact` rather than the
// substring `name` mode — matching the hand-fixed sibling BT20-100, which prints the same
// [Omekamon] / [Cool Boy] family. The `RevealAdd` slots share one `taken` set in the
// interpreter, so a single revealed card (EX11-053 Omekamon is both [Omekamon] and [LIBERATOR])
// can only fill one of the two adds.
//
// The [Main] clause is a declinable "By ..." processing condition (CR 15-7-4): the self-return
// cost is `optional`, and the play `abortOnDecline`s so refusing the cost cannot still play the
// card. `reduceCostBy` folds the -2 into the paid play rather than installing a separate
// cost-replacement, and Digi-Eggs are excluded for free because `playCostGte` rejects the
// catalog's `-1` no-play-cost sentinel.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
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
                    tokens: ["Omekamon", "Omnimon (X Antibody)"],
                    match: "nameExact",
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
                    tokens: ["Royal Knight", "LIBERATOR"],
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
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Royal Knight", "LIBERATOR"],
                  match: "trait",
                },
              ],
              playCostGte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 2,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
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

registerIrCard("EX11-071", compiled);
