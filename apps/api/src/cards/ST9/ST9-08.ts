import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST9-08 Wormmon
// [Inherited] [End of Your Turn] You may DNA digivolve this Digimon and one of your other
//   Digimon in play into a Digimon card in your hand by paying its DNA digivolve cost.
// Q712: effect allows DNA digivolving a Digimon with this card in digivolution cards,
//   along with one of your other Digimon, into a Digimon in your hand that has [DNA Digivolve].
// Q713/Q714: target card must have [DNA Digivolve] keyword; can't ignore digivolution requirements.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": [
            {
              "filter": { "isSelfRef": true },
              "count": 1,
              "zone": "battleArea"
            },
            {
              "filter": {
                "controller": "mine",
                "kind": ["Digimon"],
                "excludeSelf": true
              },
              "count": 1,
              "zone": "battleArea"
            }
          ],
          "into": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "zone": "hand",
              "hasDnaDigivolutionRequirement": true
            },
            "count": 1
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST9-08", compiled);
