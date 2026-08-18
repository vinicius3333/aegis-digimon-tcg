import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Pukumon — BT6-028 (Black Lv.7 Digimon).
//
// [Main] <Digi-Burst 2> (Trash 2 of this Digimon's Digivolution cards to activate
// the effect below.) Your Digimon can't be blocked by your opponent's Digimon this turn.
//
// KB Q1419: "If you attack with a Digimon, your opponent's Digimon can't change the
// target of attack by blocking." => the attacker can't be blocked. Modeled as the
// `cantBeBlocked` restriction on ALL of the controller's Digimon until each turn ends,
// read by combat/legality.canBlock (an attacker carrying it makes every block illegal).
//
//   attackerCondition = owner's battle-area permanents (all my Digimon)
//   defenderCondition = opponent's battle-area Digimon
//   duration = UntilEachTurnEnd
// => restrict "cantBeBlocked" on every one of my Digimon for the turn.
//
// NOTE: the prior port used `attackTargetChange`, which has NO consumer in the engine
// (a silent dead store -> blocks were still allowed). `cantBeBlocked` is the
// dedicated, CONSUMED restriction (combat/legality.ts canBlock).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: "all",
          },
          restriction: "cantBeBlocked",
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: { isSelfRef: true, zone: "digivolutionCards" },
              count: 2,
            },
            raw: "＜Digi-Burst 2＞",
          },
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 2,
          raw: "＜Digi-Burst 2＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-028", compiled);
