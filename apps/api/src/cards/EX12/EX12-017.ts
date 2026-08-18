// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.5 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)＞"
        }
      ]
    },
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
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": 1
          }
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
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": 1
          }
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
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": 1
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "Counter",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Omnimon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "ME",
                  "VB"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": true,
          "optional": true
        },
        {
          "kind": "RedirectAttack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "names": [
        "Greymon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "ME",
        "VB"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 5
    }
  ],
  "assemblyRequirement": [
    {
      "materials": [
        {
          "count": 1,
          "nameOrTrait": [
            {
              "tokens": [
                "Agumon",
                "Greymon"
              ],
              "match": "name"
            },
            {
              "tokens": [
                "ME",
                "VB"
              ],
              "match": "trait"
            }
          ],
          "level": 5
        },
        {
          "count": 1,
          "nameOrTrait": [
            {
              "tokens": [
                "Agumon",
                "Greymon"
              ],
              "match": "name"
            },
            {
              "tokens": [
                "ME",
                "VB"
              ],
              "match": "trait"
            }
          ],
          "level": 4
        },
        {
          "count": 1,
          "nameOrTrait": [
            {
              "tokens": [
                "Agumon",
                "Greymon"
              ],
              "match": "name"
            },
            {
              "tokens": [
                "ME",
                "VB"
              ],
              "match": "trait"
            }
          ],
          "level": 3
        }
      ],
      "reduceCost": 6
    }
  ]
};

registerIrCard("EX12-017", compiled);
