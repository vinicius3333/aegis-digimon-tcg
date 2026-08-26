import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-IR override (AUTO-GENERATED header removed so the generator preserves this file). The
// The hand-authored IR preserves the use-option lifecycle and whenOptionUsed watcher.
//
// BT19-040 Sakuyamon — KB authority (node tools/kb/query.mjs card BT19-040):
//   Q5469: the "when you use an Option card" effect activates AFTER the used Option's [Main] effect.
//   Q5470: it does NOT trigger when an Option's effect activates by a method OTHER than use (e.g. a
//     [Security] effect or <Delay>) — so the watcher fires only on a genuine use (the whenOptionUsed
//     produce site is the use verb, not any Option resolution).
//   Q5471/Q5472/Q5473: the "cost of 2 or more" gate reads the Option's ORIGINAL use cost itself, not
//     a paid/reduced cost — so the watcher gates on usedOptionCost (the printed cost).
// documented behavior reference: documented behavior ([When Digivolving] <Draw 2> then PlayOptionCards
//   payCost:false over CanSelectOptionCard :53-57) and :118-176 (EffectTiming.OnUseOption ->
//   the single-color/!prohibited eligibility SERVER-SIDE (08-05 path); filter.playCostLte:5
//   encodes the printed "cost of 5 or less" cap explicitly (runtime-effect review BT19-040 finding).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            colorCount: 1,
            playCostLte: 5,
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          raw: "you may use 1 single-color Option card with a cost of 5 or less from your hand without paying the cost",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerOptionCostAtLeast",
            value: 2,
            raw: "when you use an Option card with a cost of 2 or more",
          },
          actions: [
            {
              kind: "PlayToken",
              tokens: [
                {
                  name: "Pipe Fox",
                  color: "Yellow",
                  dp: 6000,
                  keywords: [{ keyword: "Blocker" }],
                },
              ],
              count: 1,
              payCost: false,
              raw: "play 1 [Pipe Fox] Token (Digimon/Yellow/6000 DP/<Blocker>)",
            },
          ],
          raw: "[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, play 1 [Pipe Fox] Token",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon: Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-040", compiled);
