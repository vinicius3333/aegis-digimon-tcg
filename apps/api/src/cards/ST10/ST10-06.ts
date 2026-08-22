// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST10-06 Mastemon
// Errata (2025-08-01): "[When Digivolving] Place 1 yellow or purple Digimon card from your trash
//   on top of your security stack face down. When DNA digivolving, search your security stack,
//   and you may play 1 level 5 or lower Digimon card among it without paying its cost.
//   Then, shuffle your security stack."
// [All Turns] When you play another Digimon using an effect, delete 1 of your opponent's Digimon
//   whose level is less than or equal to the played Digimon's level.
//   KB Q737: the level is captured at trigger time (when the Digimon was played, not resolved).
//
// Audit fixes:
// - [When Digivolving] search-and-play: was "Search to hand then PlayWithoutCost" —
//   per errata, it should search the security stack and play directly from security (SearchSecurity).
//   Gate: only when DNA digivolving (conditionedOnDnaDigivolve:true).
// - [All Turns] Delete: added levelLte comparison based on the triggering (played) Digimon's level
//   — "delete 1 of your opponent's Digimon whose level is ≤ the played Digimon's level".
//   Uses levelLteTriggerSource to capture the played Digimon's level at trigger time (KB Q737).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          // Place 1 yellow or purple Digimon from trash on top of security face down.
          // Activates on any digivolution (DNA or non-DNA).
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
            },
            count: 1,
          },
          from: ["trash"],
          toTop: true,
          faceDown: true,
        },
        {
          // When DNA digivolving only (KB Q734): search security stack and play 1 Lv.5 or lower
          // Digimon from it without paying cost (errata: search then play directly, not to hand).
          kind: "SearchSecurity",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          then: {
            kind: "PlayWithoutCost",
            source: "security",
            payCost: false,
            optional: true,
          },
          condition: {
            kind: "isDnaDigivolving",
          },
        },
        {
          // Shuffle always activates (KB Q734).
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      // [All Turns] When you play another Digimon using an effect, delete 1 of your opponent's
      // Digimon whose level is ≤ the played Digimon's level.
      // KB Q737: the played Digimon's level is captured at the time the trigger fires, even if
      // the Digimon's level later changes or the Digimon leaves play.
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            byEffect: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelLteTriggerSource: true,
                },
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Yellow",
          level: 5,
        },
        {
          color: "Purple",
          level: 5,
        },
      ],
    },
  ],
};

registerIrCard("ST10-06", compiled);
