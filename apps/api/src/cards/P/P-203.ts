// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-203 Justimon: Accel Arm
// [Digivolve] [Justimon: Blitz Arm]/[Justimon: Critical Arm]: Cost 1
// [Digivolve] Lv.5 w/[Cyberdramon] in name: Cost 3
//
// [On Play][When Digivolving][When Attacking][Once Per Turn]
//   <De-Digivolve 1> 1 of your opponent's Digimon.
//   Then, by trashing 1 Option card in the battle area,
//   this Digimon gains <Piercing> and <Security Attack +1> for the turn.
//
// [All Turns][Once Per Turn] When Option cards in the battle area are trashed,
//   1 of your opponent's Digimon can't digivolve or attack players until their turn ends.
//
// Q&A (Q5197): The trashed Option can belong to either player.
// Q&A (Q5198): The [All Turns] trigger activates when Option cards in the battle area
//   belonging to either player are trashed.
//
// Fixes:
// - [All Turns] is a SubTrigger watcher on whenTrashedByEffect (Option in battleArea,
//   either controller — the previously-dead "whenEffectTrashes" name collapsed onto this
//   already-live event, broadened to match any qualifying permanent, not just the watcher's
//   own anchor) not an unconditional continuous effect.
// - Restrict target is Digimon only (not Option).
// - Two separate Restrict actions for "digivolve" and "attackPlayers".
// - Option cost in OnPlay/WhenDigivolving/WhenAttacking has no controller restriction.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
        },
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
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 Option card in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        },
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
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
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
        },
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
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 Option card in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        },
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
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
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
        },
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
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 Option card in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        },
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
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedByEffect",
          "sourceFilter": {
            "zone": "battleArea",
            "kind": [
              "Option"
            ]
          },
          "actions": [
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "restriction": "digivolve",
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1,
                "sameTarget": true
              },
              "restriction": "attackPlayers",
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Justimon: Blitz Arm",
        "Justimon: Critical Arm"
      ],
      "cost": 1,
      "isAlternate": true
    },
    {
      "level": 5,
      "names": [
        "Cyberdramon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-203", compiled);
