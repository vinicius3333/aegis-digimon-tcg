// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          effectText: "[When Attacking] Lose 4 memory",
          duration: "untilOpponentTurnEnd",
          includeLaterEntrants: true,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["MetalGarurumon"], match: "nameExact" },
                { tokens: ["X Antibody"], match: "nameExact" },
              ],
            },
            raw: "[MetalGarurumon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelEq: "returnedDigimonLevel",
            },
            count: 1,
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            to: "deckBottom",
            storeAs: "returnedDigimonLevel",
            raw: "By returning 1 Digimon card from your trash to the bottom of the deck",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-026", compiled);
