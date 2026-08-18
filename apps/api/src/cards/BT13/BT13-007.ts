// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT13-007 (King Drasil_7D6).
//
//   0. Every effect here previously carried a spurious `"condition": {"isBreeding": true}`
//      alongside the real top-level `"isBreeding": true` flag. `evaluateCondition` requires a
//      `kind` on a Condition and falls through to its `default: return false` without one — so
//      that bogus condition object gated EVERY effect on this card closed (`runAction`'s
//      `if (effect.condition && !evaluateCondition(...)) return;`), including the [Your Turn]
//      digivolve-restriction and the [Once Per Turn] cost-reduction, not just the [Start of Your
//      Main Phase] hatch clause under test. Removed — `isBreeding: true` alone is what routes an
//      effect through the breeding-aware timing builder (builders.ts; requires
//      `ctx.source.isOnBreedingArea()`), exactly like EX6-006's identical shape (no `condition`
//      field at all).
//
// The [Breeding][Start of Your Main Phase] clause: "Reveal the top card of your Digi-Egg deck,
// then place that card and all of your [Royal Knight] trait Digimon as this Digimon's bottom
// digivolution cards."
//
//   1. The egg-deck placement: the declarative effect record modeled the Digi-Egg deck as a plain zone
//      (`Reveal{zone:"digiEggDeck"}` + `PlaceUnder{target.filter.zone:"digiEggDeck"}`) — but
//      "digiEggDeck" is not a zone the interpreter's generic loose-card enumerator recognizes
//      (only `ctx.game.player(seat).eggDeck` via the dedicated `fromEggDeck` primitive), so both
//      actions silently matched zero candidates. Re-authored as `PlaceUnder{fromEggDeck:true}`
//      targeting self — the EX6-006 pattern (same "[Breeding][Start of Your Main Phase] ...
//      Digi-Egg deck ... bottom digivolution card" shape) — which places the top egg-deck card
//      face-down under the host via the dedicated primitive (KB Q3694: no-ops on an empty deck,
//      the rest of the effect still resolves).
//   2. The Royal Knight placement relocates whole BATTLE-AREA PERMANENTS under this card, not
//      loose cards from a zone — `targetIsPermanent:true` routes it through interpreter.ts's
//      runPlaceUnder relocate-permanent branch (`ctx.fx.relocatePermanent`) instead of the
//      loose-card-only default path, which silently no-ops on a battleArea-zoned permanent
//      target (see runPlaceUnder's own comment on the "loud gap" this flag closes).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "restriction": "digivolve",
          "duration": "permanent"
        }
      ],
      "isBreeding": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Royal Knight"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 4,
              "raw": "reduce the play cost by 4",
              "optional": true
            },
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "Further reduce it by 1",
              "scaling": {
                "per": 1,
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "unit": "digivolutionCards"
              }
            }
          ]
        }
      ],
      "isBreeding": true,
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlaceUnder",
          "fromEggDeck": true,
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        },
        {
          "kind": "PlaceUnder",
          "targetIsPermanent": true,
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "battleArea",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "underFilter": {
            "isSelfRef": true
          },
          "position": "bottom"
        }
      ],
      "isBreeding": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOptionPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Option"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Royal Knight"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ],
          "raw": "When an Option card with the [Royal Knight] trait is placed in the battle area, gain 1 memory"
        }
      ],
      "isInherited": true,
      "isBreeding": true,
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-1"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-007", compiled);
