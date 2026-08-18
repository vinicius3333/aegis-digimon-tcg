import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-026 Crescemon — Digimon
// Alt digivolution: from Lv.4 w/[TS] traits cost 3
// [On Play][When Digivolving] Trash the bottom 3 digivolution cards of 1 of your
//   opponent's Digimon. Then, 1 of their Digimon with no digivolution cards can't
//   suspend until their turn ends.
// [Your Turn] When your Digimon are played or digivolve, if any of them are red,
//   this Digimon may digivolve into [Dianamon] in the trash with the cost reduced by 2.
//   (KB Q6290: triggers even on non-red Digimon, but can only activate if that Digimon is red.
//    KB Q6291: references the Digimon after it digivolves.)
// [Inherited] This Digimon's attack target can't be changed (your turn only).
//
// (the triggering permanent's top card is red — Q6290/Q6291, read POST-digivolve) and
// `IsOwnerTurn`. Both are expressed as the SubTrigger `fireCondition` (allOf of
// `triggerSubjectHasColor:{red}` + `isYourTurn`); the watcher body is skipped entirely when the
// gate does not hold, so the (mandatory once activated) digivolve never runs on a non-red event.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 3,
          "fromTop": false
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 3,
          "fromTop": false
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "fireCondition": {
            "kind": "allOf",
            "conditions": [
              { "kind": "triggerSubjectHasColor", "filter": { "colors": ["Red"] } },
              { "kind": "isYourTurn" }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Dianamon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "from": [
                "trash"
              ],
              "payCost": true,
              "costDelta": -2,
              "optional": true
            }
          ],
          "raw": "[Your Turn] When your Digimon are played, if any of them are red, this Digimon may digivolve into [Dianamon] in the trash with the cost reduced by 2"
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "fireCondition": {
            "kind": "allOf",
            "conditions": [
              { "kind": "triggerSubjectHasColor", "filter": { "colors": ["Red"] } },
              { "kind": "isYourTurn" }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Dianamon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "from": [
                "trash"
              ],
              "payCost": true,
              "costDelta": -2,
              "optional": true
            }
          ],
          "raw": "[Your Turn] When your Digimon digivolve, if any of them are red, this Digimon may digivolve into [Dianamon] in the trash with the cost reduced by 2"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attackTargetChange",
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "TS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
};

registerIrCard("BT25-026", compiled);
