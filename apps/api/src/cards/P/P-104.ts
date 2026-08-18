import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-104 Mental Training — hand-corrected IR override (no AUTO-GENERATED header, so the
// generator preserves this file). The runtime record dropped the blue-color constraints the
//   - RevealAdd `add[0].filter` was `{}`; corrected to `{ colors: ["Blue"] }` so only a
//   - Digivolve `into` was `{ kind: ["Digimon"] }`; corrected to add `colors: ["Blue"]`
//     so only blue Digimon are legal <Delay> digivolve targets (Q4192).
//   - Added `costDelta: -2`. NOTE: the interpreter's
//     runDigivolve does not yet apply costDelta (documented v1 limitation), so the cost
//     reduction is not realized — see BT9-109-style engine gap; P-104.test.ts keeps that
//     assertion as it.fails until digivolveFromInstance honors a cost delta.
//   - Marked the Digivolve action `optional: true` — the <Delay> reads "1 of your Digimon
//     MAY digivolve", and Q4195 confirms the controller may choose not to digivolve.
//   - Dropped the first [Main] clause's `Return{zone:"trash"}` action: it has no basis in the
//     printed text or the documented behavior `SimplifiedRevealDeckTopCardsAndSelect` + `PlaceDelayOptionCards`
//     pair — the reveal is followed directly by self-placement, nothing returns from trash.
//   - Replaced the first [Main] clause's stand-in self-targeted permanent Delay GainKeyword
//     with `PlaceInBattleAreaSelf` — the printed "Then, place this card into your battle
//     area." (confirmed by documented behavior `PlaceDelayOptionCards`), matching sibling P-105's shape.
//   - Moved the second [Main] clause's ＜Delay＞ off a mis-encoded `Delete{kind:["Digimon"]}`
//     action (which trashed an arbitrary Digimon, not this card — the documented behavior source deletes
//     `card.PermanentOfThisCard()`, i.e. the option itself) onto a declared `keywords: [Delay]`
//     on the effect. The interpreter's OnDeclaration Delay branch already deletes the SOURCE
//     permanent as the trash-cost, applies the "can't activate the turn this card enters play"
//     gate (rules 16-17-3), and asks optionally (16-17-2) — see `withIntrinsicDelayGate` /
//     the `isDelay && timing === EffectTiming.OnDeclaration` branch in interpreter.ts.
//   - The [Security] clause's placement is likewise `PlaceInBattleAreaSelf` (unconditional,
//     per securityEffectText "Place this card in the battle area."), not a for-the-turn Delay
//     grant — the card's own ＜Delay＞ ability lives on the second [Main] clause above, not on
//     a separately-granted keyword.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 2,
          "add": [
            {
              "filter": { "colors": ["Blue"] },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "keywords": [
        { "keyword": "Delay", "raw": "＜Delay＞" }
      ],
      "actions": [
        {
          "kind": "Digivolve",
          "optional": true,
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Blue"
            ]
          },
          "costDelta": -2,
          "payCost": true,
          "from": [
            "hand"
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "isSecurity": true,
      "actions": [
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("P-104", compiled);
