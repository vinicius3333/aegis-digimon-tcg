// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override (runtime-effect fix). "This effect can't play [Omnimon] or
// [Gankoomon]" is a play-target exclusion (excludeNames on the PlayWithoutCost filter),
// NOT a separate Restrict action — the prior `cannotPlay:...` restriction string was not
// a recognized RestrictionKind and was inert. Source zones for the played card are the
// trash (Sistermon) and breeding-area digivolution cards (Royal Knight).
const playFromTrashOrBreeding = () => [
  {
    "kind": "PlayWithoutCost",
    "target": {
      "filter": {
        "excludeNames": ["Omnimon", "Gankoomon"],
        "or": [
          {
            "nameOrTrait": [{ "tokens": ["Sistermon"], "match": "name" }]
          },
          {
            "trait": "Royal Knight",
            "hostFilter": {
              "zone": "breeding"
            }
          }
        ]
      },
      "count": 1,
      "upTo": true
    },
    "from": ["trash", "digivolutionCards"],
    "payCost": false
  }
];
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": playFromTrashOrBreeding(),
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": playFromTrashOrBreeding(),
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-019", compiled);
