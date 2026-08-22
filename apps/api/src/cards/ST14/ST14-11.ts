            "colors": [
              "Purple"
            ]
          },
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "zone": "hand",
                  "controller": "mine"
                },
                "count": 1
              },
              "to": "deckTop"
            },
            {
              "kind": "GainMemory",
              "amount": 1,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer and return 1 card from your hand to your deck"
              },
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST14-11", compiled);
