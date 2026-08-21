// @ts-nocheck
// HAND-FIXED IR — do not regenerate
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ActivateEffect",
          "effectType": "OnPlay",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [{ "tokens": ["Cyborg", "Ver.5"], "match": "trait" }],
              "zone": "digivolutionCards"
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "levels": [
                  5
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Cyborg",
                      "Ver.5"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 level 5 [Cyborg] or [Ver.5] trait card from your hand or trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ActivateEffect",
          "effectType": "OnPlay",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [{ "tokens": ["Cyborg", "Ver.5"], "match": "trait" }],
              "zone": "digivolutionCards"
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "levels": [
                  5
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Cyborg",
                      "Ver.5"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 level 5 [Cyborg] or [Ver.5] trait card from your hand or trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ActivateEffect",
          "effectType": "OnPlay",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [{ "tokens": ["Cyborg", "Ver.5"], "match": "trait" }],
              "zone": "digivolutionCards"
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "levels": [
                  5
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Cyborg",
                      "Ver.5"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 level 5 [Cyborg] or [Ver.5] trait card from your hand or trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "zone": "digivolutionCards",
                    "hostFilter": {
                      "isSelfRef": true
                    },
                    "withinBottomN": 2,
                    "faceDownOrTrait": {
                      "tokens": [
                        "Cyborg"
                      ],
                      "match": "trait"
                    }
                  },
                  "count": 2
                },
                "raw": "by trashing its bottom 2 face-down or [Cyborg] trait digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ],
          "raw": "wouldLeavePlay"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "DM"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX9-073", compiled);
