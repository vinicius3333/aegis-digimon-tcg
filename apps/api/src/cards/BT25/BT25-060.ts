// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT25-060 (Rebootmon).
// Fixes:
// 1. AllTurns SubTrigger: added GrantStatic immuneToOpponentDigimonEffects action
//    — text says "opponent's Digimon effects don't affect it" (KB Q6358/Q6363).
// 2. AllTurns SubTrigger: added a second SubTrigger for "whenUnsuspended" (the text
//    fires on "gets linked OR unsuspends").
// 3. KB Q6357: the linked card must itself carry <Link> (hasLinkRequirement filter
//    added to the cost target in WhenDigivolving/WhenAttacking raw cost description).
//    The cost remains raw (no Cost.kind:"link" exists); see LANE_H.md.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Link",
          "amount": 1,
          "raw": "＜Link +1＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true,
          "cost": {
            "kind": "raw",
            "raw": "By linking 1 [Appmon] trait Digimon card with <Link> from your hand or this Digimon's digivolution cards to this Digimon without paying the cost"
          },
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true,
          "cost": {
            "kind": "raw",
            "raw": "By linking 1 [Appmon] trait Digimon card with <Link> from your hand or this Digimon's digivolution cards to this Digimon without paying the cost"
          },
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "keyword": { "keyword": "Piercing", "raw": "＜Piercing＞" },
              "duration": "untilYourTurnEnd"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "keyword": { "keyword": "Blocker", "raw": "＜Blocker＞" },
              "duration": "untilYourTurnEnd"
            },
            {
              "kind": "GrantStatic",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "grant": "immuneToOpponentDigimonEffects",
              "duration": "untilYourTurnEnd"
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenUnsuspended",
          "sourceFilter": { "isSelfRef": true },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "keyword": { "keyword": "Piercing", "raw": "＜Piercing＞" },
              "duration": "untilYourTurnEnd"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "keyword": { "keyword": "Blocker", "raw": "＜Blocker＞" },
              "duration": "untilYourTurnEnd"
            },
            {
              "kind": "GrantStatic",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "grant": "immuneToOpponentDigimonEffects",
              "duration": "untilYourTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "Link-as-cost (Cost.kind:link) not yet implemented"
  ],
  "appFusionRequirement": [
    {
      "names": [
        "Bootmon",
        "Shutmon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT25-060", compiled);
