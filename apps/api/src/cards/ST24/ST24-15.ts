// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST24-15 DNA Charge
// <Use Req. ([DATA SQUAD] trait)>
// [Main] You may play 1 [DATA SQUAD] trait card with a play cost of 4 or less from your hand
//   or trash without paying the cost. Then, place this card in the battle area.
// [Start of Your Main Phase] By placing this card from the battle area face down under any of
//   your [DATA SQUAD] trait Tamers, <Draw 1> and gain 1 memory.
// [Security] Activate this card's [Main] effect.
//
// Fix: "You may play...Then, place this card" — placement is mandatory if play is chosen.
// PlayWithoutCost gets abortOnDecline:true; PlaceInBattleAreaSelf is not independently optional.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
          "condition": {
            "kind": "youHave",
            "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["DATA SQUAD"], "match": "trait" }] },
            "raw": "you have a card w/[DATA SQUAD] trait"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 4,
              "nameOrTrait": [
                {
                  "tokens": [
                    "DATA SQUAD"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true,
              "from": [
                "field"
              ]
            },
            "raw": "By placing this card from the battle area face down under any of your [DATA SQUAD] trait Tamers",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "DATA SQUAD"
                  ],
                  "match": "trait"
                }
              ]
            }
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST24-15", compiled);
