// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-027 HoverEspimon
// effectText:
//   [On Play][When Digivolving] Reveal the top card of your opponent's security stack.
//     If that card is a Digimon card, gain 1 memory. If it's a non-Digimon card, <Draw 1>.
//     Place the revealed card at the top or bottom of your opponent's security stack face down.
//   [All Turns] While there's a Tamer, this Digimon gains <Blocker> and can't be deleted
//     by your opponent's effects.
//
// Audit fixes:
// - [On Play][When Digivolving]: last action was "addTop" — should be "addTopOrBottom"
//   (KB Q4102: the effect activator chooses top or bottom).
// - "face down" placement: add faceDown:true to the SecurityManipulation action.
// - [All Turns] Aura was missing "can't be deleted by your opponent's effects" —
//   added a second Aura for GrantStatic immuneToOpponentDeleteEffects while Tamer present.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "revealTop",
          controller: "opponent",
          source: "security",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "triggerRevealedMatchesFilter",
            filter: { kind: ["Digimon"] },
            raw: "that card is a Digimon card",
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: { kind: "triggerRevealedMatchesFilter", filter: { kind: ["Digimon"] } },
            raw: "it's a non-Digimon card",
          },
        },
        {
          // KB Q4102: the activating player chooses top or bottom; face down placement.
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: "revealed",
          faceDown: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "revealTop",
          controller: "opponent",
          source: "security",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "triggerRevealedMatchesFilter",
            filter: { kind: ["Digimon"] },
            raw: "that card is a Digimon card",
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: { kind: "triggerRevealedMatchesFilter", filter: { kind: ["Digimon"] } },
            raw: "it's a non-Digimon card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: "revealed",
          faceDown: true,
        },
      ],
    },
    {
      // [All Turns] While there's a Tamer: gain <Blocker> AND can't be deleted by opponent effects.
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "zoneCount",
            seat: "mine",
            zone: "battleArea",
            filter: { kind: ["Tamer"] },
            op: "gte",
            value: 1,
            raw: "there's a Tamer",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "grant",
            grant: "immuneToOpponentDeleteEffects",
          },
          while: {
            kind: "zoneCount",
            seat: "mine",
            zone: "battleArea",
            filter: { kind: ["Tamer"] },
            op: "gte",
            value: 1,
            raw: "there's a Tamer",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-027", compiled);
