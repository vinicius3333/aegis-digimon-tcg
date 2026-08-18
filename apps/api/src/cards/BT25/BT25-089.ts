import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT25-089 (Kazuki & Itsuki). source:
//
// Corrections applied vs the auto-generated record:
//   1. [Main] — replaced RawUnparsed with a Link action (suspend-cost + Appmon
//      trait filter + hasLinkRequirement gate + recipient any-friendly-Digimon +
//      costDelta -2 + from hand or digivolution cards). The suspend cost is on the
//      (documented behavior CanLinkCardCondition = IsDigimon && EqualsTraits("Appmon") &&
//      CanLink(payCost)) and KB Q6422 (2026-05-08), the linked card must BOTH carry
//      the [Appmon] trait AND have a <Link> requirement of its own. The filter now
//      enforces both: `nameOrTrait Appmon` + `hasLinkRequirement: true` (the latter
//      reads CardDefinition.linkRequirement, the source LinkRequirement header
//      solely the effect factory.PlaySelfTamerSecurityEffect(card).
//      Digimon app fuse into a Digimon card in hand). Now authored as an AppFuse action
//      (engine path: AppFuse IR kind + appFuseInto verb). App-fusion legality and cost
//      are owned by the fusion-TARGET card's appFusionRequirement (documented behavior
//      CanAppFusionFromTargetPermanent over AddAppfuseMethodByName), NOT DnaDigivolve:
//      the fusing Digimon's stack is carried under the fusion result on top, with no
//      permanent consumed off the field.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": ["Digimon"]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Link",
          "optional": true,
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "By suspending this Tamer"
          },
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [{ "tokens": ["Appmon"], "match": "trait" }],
              "hasLinkRequirement": true
            },
            "count": 1
          },
          "recipient": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "from": ["hand", "digivolutionCards"],
          "costDelta": -2,
          "raw": "[Main] By suspending this Tamer, you may link 1 [Appmon] trait Digimon card from your hand or your Digimon's digivolution cards to 1 of your Digimon with the cost reduced by 2."
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "frequency": "OncePerTurn",
      "actions": [
        {
          "kind": "AppFuse",
          "source": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "into": {
            "kind": ["Digimon"]
          },
          "from": ["hand"],
          "raw": "[End of Your Turn] [Once Per Turn] 1 of your Digimon may app fuse into a Digimon card in the hand."
        }
      ]
    },
    {
      "trigger": "Security",
      "isSecurity": true,
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT25-089", compiled);
