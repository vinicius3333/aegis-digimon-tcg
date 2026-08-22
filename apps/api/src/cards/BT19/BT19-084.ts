import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-084 Winr — Tamer
// [Start of Your Main Phase] If you have face-up security cards, gain 1 memory.
// [Main] By suspending this Tamer, 1 of your Digimon digivolves into a Digimon card in your
//   FACE-UP security cards. If this effect digivolved, you may place 1 Digimon card with the
//   [Royal Base] trait from your hand face up as your bottom security card.
// [Security] Play this Tamer without paying the cost.
//
// Faithful port:
//  - The [Main] effect pays a suspend-this-Tamer cost, then
//    digivolves 1 of your Digimon into a Digimon card in your FACE-UP security (the source is
//  - The "then place [Royal Base]" clause is gated on the digivolve actually happening via the
//    08-01 result binding (`ifThisEffectDigivolved`; KB BT19-084 the place-tail runs only if it
//    digivolved). The placement is face-up as the BOTTOM security card and is optional ("you may").
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "security",
              faceUp: true,
            },
            raw: "you have a face-up security card",
          },
        },
      ],
    },
    {
      trigger: "Main",
      optional: true,
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controller: "mine",
            kind: ["Digimon"],
          },
          from: ["security"],
          payCost: true,
          cost: {
            kind: "suspend",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            upTo: true,
          },
          from: ["hand"],
          toTop: false,
          faceUp: true,
          optional: true,
          condition: {
            kind: "ifThisEffectDigivolved",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-084", compiled);
