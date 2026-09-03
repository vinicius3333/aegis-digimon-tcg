import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT9-044 (Magnamon X Antibody).
//
// Audit fixes:
//
// 1. The printed text uses the primary form "Digivolve: 4 from [Magnamon]" — not a bracketed
//    alternate form. Keep the required typed field explicit as isAlternate: false.
//
// 2. [All Turns] Replacement effect: "you may place the top card of this Digimon on top of
//    your security stack face down to prevent that deletion." KB Q1840 confirms you CANNOT
//    activate this effect when there are no digivolution cards (the action requires a card to
//    place). Fix: add condition selfDigivolutionCountAtLeast: 1 to the Replacement.

export const compiled: CompiledCard = {
  effects: [
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
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Armor Form"],
                      match: "trait",
                    },
                    {
                      tokens: ["X Antibody"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "a card with [Armor Form] in its traits or [X Antibody] is in this Digimon's digivolution cards",
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          optional: true,
          sourceFilter: {
            isSelfRef: true,
          },
          condition: {
            kind: "selfDigivolutionCountAtLeast",
            value: 1,
            raw: "this Digimon has at least 1 digivolution card",
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              toTop: true,
              faceUp: false,
              detachPermanentTop: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Magnamon"],
      cost: 4,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT9-044", compiled);
