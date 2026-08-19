// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT14-033 (Patamon). Printed text: "[Start of Your Main Phase]
// Search your security stack. This Digimon may digivolve into a yellow Digimon card with the
// [Vaccine] trait among them without paying the cost. Then, shuffle your security stack. If
// digivolved by this effect, you may place 1 yellow [Vaccine] card from your hand at the bottom
// of your security stack." (KB Q2407: the digivolve is optional; declining still shuffles.)
//
// The Digivolve source is the SECURITY STACK, not the default hand/trash — `from:["security"]`
// plus `faceDownSecurityOk:true` (Search reveals the whole stack to the controller regardless of
// orientation, and a digivolve may pick any of the revealed cards, matching BT16-024's identical
// "digivolve among the revealed security" pattern). A prior plain-compiler regen dropped both
// fields, silently reducing the Digivolve to a no-candidate no-op (this file's own regression).
//
// The trailing placeAsSecurity step's condition text is normalized to the ONE phrase the
// interpreter's `raw` condition kind recognizes for the digivolve-result binding
// ("this effect digivolved" — see interpreter.ts's `evaluateCondition` "raw" case); the printed
// order ("digivolved by this effect") does not match that regex and silently never fires.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Search",
          "controller": "mine",
          "filter": {
            "zone": "security"
          },
          "count": "all",
          "to": "revealed"
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vaccine"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "security"
          ],
          "faceDownSecurityOk": true,
          "amongPreviousSearch": true,
          "payCost": false,
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "shuffle",
          "controller": "mine"
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "controllerDefault": "mine",
              "colors": [
                "Yellow"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vaccine"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": false,
          "condition": {
            "kind": "ifThisEffectDigivolved",
            "raw": "this effect digivolved"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAddSecurity",
          "fireCondition": {
            "kind": "triggerSecurityIsYours"
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-033", compiled);
