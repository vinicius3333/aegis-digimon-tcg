import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-056 WereGarurumon — hand-authored IR override (AUTO-GENERATED header removed so the
// regen preserves this file).
//
// [On Play] / [When Digivolving]: "If you have a Tamer with the [CS] trait, give 1 of your
// opponent's Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends."
// The runtime record mismodeled this as a direct force-attack verb (Attack{opponent Digimon}) AND
// dropped the [CS] Tamer precondition that gates the whole effect. The faithful behavior installs
// a TIMED triggered ability onto the CHOSEN opponent Digimon: a startOfYourMainPhase SubTrigger
// (event fired at OnStartMainPhase, gated server-side to the watched permanent's owner's main
// phase) whose body is "this Digimon attacks", lasting until that owner's turn ends.
//
//        with HasCSTraits gates the entire effect (no [CS] Tamer => nothing is granted).
//   :58-89 select 1 opponent battle-area Digimon (SharedCanSelectPermamentCondition).
//   :95-171 the granted rule implementation: EffectDescription "[Start of Your Main Phase] Attack with
//        (:110-124); ActivateCoroutine1 makes selectedPermanent attack (:142-161).
//   :175 selectedPermanent.UntilOwnerTurnEndEffects.Add — the until-owner-turn-end lifecycle.
//   KB Q5321 (binding): the granted ability is given to the chosen Digimon.
//
// The [CS] Tamer gate is the youHave Condition with a Tamer kind + a [CS] trait nameOrTrait
// (CardTraits = Form ∪ Attribute ∪ Type, interpreter.ts:234). The until-owner-turn-end window is
// `untilOpponentTurnEnd` (the chosen permanent belongs to the opponent, so its owner's turn-end
// is the opponent's turn-end relative to this card's owner) — runSubTrigger maps it to the
// granted permanent's controller's turn-end expiry.
// The inherited "When attack targets change" clause uses the distinct attack-target-change bus,
// not the normal when-attacking declaration event.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Blocker"
          },
          "duration": "permanent"
        }
      ],
      "keywords": []
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "startOfYourMainPhase",
          "condition": {
            "kind": "youHave",
            "filter": {
              "kind": ["Tamer"],
              "nameOrTrait": [{ "tokens": ["CS"], "match": "trait" }]
            }
          },
          "on": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "duration": "untilOpponentTurnEnd",
          "actions": [
            {
              "kind": "Attack",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              }
            }
          ],
          "raw": "give 1 of your opponent's Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "startOfYourMainPhase",
          "condition": {
            "kind": "youHave",
            "filter": {
              "kind": ["Tamer"],
              "nameOrTrait": [{ "tokens": ["CS"], "match": "trait" }]
            }
          },
          "on": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "duration": "untilOpponentTurnEnd",
          "actions": [
            {
              "kind": "Attack",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              }
            }
          ],
          "raw": "give 1 of your opponent's Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttackTargetSwitched",
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": 1
            }
          ],
          "raw": "When attack targets change, ＜De-Digivolve 1＞ 1 of your opponent's Digimon"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "CS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
};

registerIrCard("BT23-056", compiled);
