import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
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
                  tokens: ["Sunarizamon", "Close"],
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
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Close"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Mineral", "Rock"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                // KB Q5183: the card must have BOTH traits. `traits` is a single OR-matched
                // token list (matching/definition.ts routes it through one `matchNameOrTrait`
                // whose tokens are `.some()`-matched), so `traits: ["Mineral","LIBERATOR"]`
                // accepted a Mineral-only or LIBERATOR-only card. `nameOrTrait` and `traits`
                // are separate conjunctive gates, which is the documented way to AND them.
                nameOrTrait: [
                  {
                    tokens: ["Mineral"],
                    match: "trait",
                  },
                ],
                traits: ["LIBERATOR"],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
              optional: true,
            },
          ],
        },
      ],
      // ＜Delay＞ printed on a continuous window. `delayArmedIntrinsic` is a marker the
      // interpreter SYNTHESIZES (`withIntrinsicDelayGate`, interpreter/effect.ts) for every
      // SubTrigger/Replacement of a Delay-keyworded continuous effect; it is not part of the
      // compiled IR, so the printed keyword is the encoding that belongs here. The registered
      // effect still reaches `runSubTrigger` with the same gate: §16-17-1 trash-this-card cost,
      // §16-17-3 no activation the turn it entered play.
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-069", compiled);
