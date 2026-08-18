import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-073 Eater Bit — hand-authored IR override.
//
// The leave-play prevention uses an alternative cost: delete this Digimon OR place this
// Digimon as the bottom digivolution card of a [Mother Eater] in breeding.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "leaveCause": "otherThanYourEffect",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Eater",
                  "Hudie"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
              "costOptions": [
                {
                  "kind": "deleteOwn",
                  "target": {
                    "filter": {
                      "isSelfRef": true
                    },
                    "count": 1,
                    "isSelf": true
                  },
                  "raw": "deleting this Digimon"
                },
                {
                  "kind": "place",
                  "target": {
                    "filter": {
                      "isSelfRef": true
                    },
                    "count": 1,
                    "isSelf": true
                  },
                  "destination": "digivolutionStack",
                  "position": "bottom",
                  "host": {
                    "filter": {
                      "controller": "mine",
                      "zone": "breeding",
                      "kind": [
                        "Digimon"
                      ],
                      "nameOrTrait": [
                        {
                          "tokens": [
                            "Mother Eater"
                          ],
                          "match": "name"
                        }
                      ]
                    },
                    "count": 1
                  },
                  "targetIsPermanent": true,
                  "raw": "placing it as the bottom digivolution card of your [Mother Eater] in the breeding area"
                }
              ],
              "optional": true,
              "abortOnDecline": true
            }
          ],
          "raw": "wouldLeavePlay"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Eater"
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
              "amount": 1,
              "raw": "reduce the play costs by 1",
              "optional": true
            }
          ],
          "raw": "wouldBePlayed"
        }
      ],
      "isInherited": true,
      "isBreeding": true,
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-073", compiled);
