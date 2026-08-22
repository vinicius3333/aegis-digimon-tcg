// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT20-101.
// effectText: "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may
// unsuspend." — "any Digimon" (not "your Digimon") means the watcher's sourceFilter and
// the "for every 2 suspended Digimon" scaling filter must default to controller "any", not
// "mine". The general compiler path (sub-trigger.mjs's subTriggerSourceFilter for
// whenSuspended) hardcodes `parseFilter(subject, "mine")` for any non-self subject text,
// which is wrong here — but 6 OTHER corpus cards share the exact same "When any Digimon
// suspend(s)" phrasing and their OWN committed corpus entries still carry the same "mine"
// default (BT20-045, BT25-059, BT25-090, EX11-062, EX11-074, P-222) — each would need its
// own KB-checked verdict before a shared fix could touch them safely. This card's corpus
// value is independently confirmed correct by its own text ("any Digimon", not "your
// Digimon"); rather than widen the general handler and risk perturbing those 6 unverified
// siblings, this card alone is pinned as a hand override so a future recompile can't
// silently revert its "any" back to "mine".
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Vortex",
          "raw": "＜Vortex＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "controllerDefault": "any",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true,
          "scaling": {
            "per": 2,
            "filter": {
              "controllerDefault": "any",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true,
          "scaling": {
            "per": 2,
            "filter": {
              "controllerDefault": "any",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 6,
      "traits": [
        "Vortex Warriors"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-101", compiled);
