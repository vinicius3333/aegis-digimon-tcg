// @ts-nocheck
// HAND-FIXED IR for BT21-044 (RizeGreymon) — do not regenerate over this file.
//
// runtime-effect fix: the generated OnPlay/WhenDigivolving bundle granted only <Rush> and
// <Alliance> and dropped the "is also treated as a 3000 DP Digimon" + "can't
// digivolve" parts of "For the turn, 1 of your [Marcus Damon]s is also treated as a
// 3000 DP Digimon, can't digivolve, and gains <Rush> and <Alliance>." Marcus Damon is
// a TAMER, so the target filter must not require kind:["Digimon"] either (mirrors the
// AD1-021 fix for the same "[Marcus Damon] treated as a Digimon" pattern): GrantStatic
// kinds:["Digimon"] + SetBaseDP 3000 + Restrict digivolve, composed with the existing
// GainKeyword Rush/Alliance grants (KB Q4545-Q4551). Actions are inlined per effect
// (not factored into a shared const) so the static IR auditor can parse the literal.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "grant": "kinds",
          "tokens": [
            "Digimon"
          ],
          "duration": "forTheTurn"
        },
        {
          "kind": "SetBaseDP",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "value": 3000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "restriction": "digivolve",
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "grant": "kinds",
          "tokens": [
            "Digimon"
          ],
          "duration": "forTheTurn"
        },
        {
          "kind": "SetBaseDP",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "value": 3000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "restriction": "digivolve",
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "colors": [
              "Red",
              "Yellow"
            ]
          },
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "placeAsSecurity",
              "controller": "mine",
              "source": {
                "filter": {
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Marcus Damon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "trash"
              ],
              "toTop": true,
              "optional": true
            }
          ],
          "raw": "onDeletionOf"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "colors": [
              "Red",
              "Yellow"
            ]
          },
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "placeAsSecurity",
              "controller": "mine",
              "source": {
                "filter": {
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Marcus Damon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "trash"
              ],
              "toTop": true,
              "optional": true
            }
          ],
          "raw": "onDeletionOf"
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
      "names": [
        "GeoGreymon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-044", compiled);
