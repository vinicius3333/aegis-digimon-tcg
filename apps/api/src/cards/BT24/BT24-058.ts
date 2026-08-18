// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-058 Blimpmon
// Fix: add filter split — trait restriction applies only to Digimon; Tamer cards need no trait.
//   Both add entries are optional; player chooses: add to hand OR place as bottom digivolution card.
//   See LANE_H.md CAP-H-09 for mutual-exclusivity engine spec.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "orFilters": [
                {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                }
              ],
              "count": 1,
              "to": "hand",
              "optional": true
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "orFilters": [
                {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                }
              ],
              "count": 1,
              "to": "placeUnder",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "optional": true
            }
          ],
          "rest": "deckTopOrBottom"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "orFilters": [
                {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                }
              ],
              "count": 1,
              "to": "hand",
              "optional": true
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "orFilters": [
                {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                }
              ],
              "count": 1,
              "to": "placeUnder",
              "underFilter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "optional": true
            }
          ],
          "rest": "deckTopOrBottom"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    }
  ],
  "coverage": "partial",
  "residual": [
    "RevealAdd add-destination choice: text requires exactly 1 card taken to exactly 1 destination (hand OR placeUnder as a mandatory binary choice); IR encodes two optional add entries since the engine lacks mutual-exclusivity/mandatory-binary-choice for add destinations — see LANE_H.md CAP-H-09"
  ],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-058", compiled);
