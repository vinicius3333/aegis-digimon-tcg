// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving][When Attacking] cost: trash exactly 3 divo cards with [Mineral]/[Rock]
// trait from any of your Digimon (KB Q3937: can split across multiple; Q3938: must be exactly 3).
// Effect: unsuspend self + gain <Security Attack +1> for the turn.
// [End of Your Turn] KB Q3940: the whole effect is optional ("You may place up to 3
// cards..."), but once you choose to activate it you must place at least 1 (not 0) — a
// bare `upTo:true, count:3` target lets the interpreter auto-resolve a 0-card pick, which
// contradicts the ruling. Composed as two PlaceUnder actions instead of an engine flag:
// the first places exactly 1 (mandatory once entered), the second optionally places up to
// 2 more from what remains. Together they give an effective 1-3 range with the same
// filter/host, so "declined entirely" (0 total) is only reachable via the effect-level
// `optional` ask, never via the per-card selection prompt.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fragment",
          amount: 3,
          raw: "＜Fragment (3)＞",
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
            },
            raw: "By trashing any 3 digivolution cards with the [Mineral]/[Rock] trait from your Digimon",
          },
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
            },
            raw: "By trashing any 3 digivolution cards with the [Mineral]/[Rock] trait from your Digimon",
          },
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
            from: ["trash"],
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
        },
      ],
      frequency: "OncePerTurn",
      optional: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("EX8-055", compiled);
