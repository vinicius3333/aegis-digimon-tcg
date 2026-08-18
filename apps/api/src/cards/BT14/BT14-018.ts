// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Amon of Crimson Flame",
            "Umon of Blue Thunder"
          ],
          "count": 1,
          "payCost": false
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Amon of Crimson Flame",
            "Umon of Blue Thunder"
          ],
          "count": 1,
          "payCost": false
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "mode": "instead",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Amon of Crimson Flame"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Umon of Blue Thunder"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "mode": "instead",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Amon of Crimson Flame"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Umon of Blue Thunder"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Amon of Crimson Flame"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Umon of Blue Thunder"
                ],
                "match": "name"
              }
            ]
          },
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
                "keyword": "Recovery",
                "raw": "＜Recovery +1 (Deck)＞",
                "amount": 1
              },
              "duration": "permanent"
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-018", compiled);
