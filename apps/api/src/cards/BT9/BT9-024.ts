// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-024 (Garurumon X Antibody).
// Inherited effect: when this Digimon has [Garurumon] or [Omnimon] in its name and
// would be deleted in battle, you may trash 2 cards of the same level from its
// digivolution cards to prevent that deletion.
// KB Q1825: the 2 trashed cards must be same level AS EACH OTHER (not the Digimon's level).
// KB Q1826: this card itself (in the digivolution cards) can be one of the 2 trashed.
// Encoded as a Replacement "prevent" with a sameLevelPair cost from digivolutionCards.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBeDeleted",
          "mode": "prevent",
          "leaveCause": "byBattle",
          "optional": true,
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Garurumon",
                  "Omnimon"
                ],
                "match": "name"
              }
            ]
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "digivolutionCards",
                "isSelfRef": true,
                "sameLevelPair": true
              },
              "count": 2,
              "from": [
                "digivolutionCards"
              ]
            },
            "raw": "by trashing 2 cards of the same level from this Digimon's digivolution cards"
          },
          "raw": "you may trash 2 cards of the same level in this Digimon's digivolution cards to prevent that deletion"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Garurumon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-024", compiled);
