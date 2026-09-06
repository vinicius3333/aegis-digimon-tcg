// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST22-06 Sakuyamon: Maid Mode
// [Digivolve] [Sakuyamon]: Cost 1
// [On Play] [When Digivolving] You may use 1 Option card with the [Onmyōjutsu] or
//   [Plug-In] trait from your hand or under your Tamers without paying the cost.
// [All Turns] [Once Per Turn] When you use Option cards or your security stack is
//   removed from, by placing 1 of your opponent's Digimon with the lowest DP as the
//   bottom security card, trash their top security card.
//
// KB Q5421: used Option card from under Tamer is trashed after activation.
// KB Q5422: "when you use an Option card" fires after the Option's [Main] effect.
// KB Q5423: "when you use an Option card" does NOT trigger if activated by [Security]
//   or <Delay> — only fires on a manual use action.
// KB Q5424: [Security] effects take precedence; other triggered effects follow turn-player order.
// KB Q5425: if the Digimon can't leave (prevented), the security card is NOT trashed.
// KB Q5426: [Once Per Turn] count occurs as soon as you choose to activate the effect.
//
// Fixes vs prior IR:
// - OnPlay/WhenDigivolving: changed Trash+activate to UseOptionWithoutCost with proper
//   trait filters and "from hand or under Tamers" (from:["hand","underTamers"]).
// - AllTurns: added missing whenOptionUsed SubTrigger alongside whenSecurityRemoved.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          target: {
            filter: {
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "underTamers"],
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          target: {
            filter: {
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "underTamers"],
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
            },
          ],
          cost: {
            kind: "place",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
              count: 1,
              from: ["battleArea"],
            },
            destination: "security",
            position: "bottom",
            targetIsPermanent: true,
            raw: "by placing 1 of your opponent's Digimon with the lowest DP as the bottom security card",
          },
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
            },
          ],
          cost: {
            kind: "place",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
              count: 1,
              from: ["battleArea"],
            },
            destination: "security",
            position: "bottom",
            targetIsPermanent: true,
            raw: "by placing 1 of your opponent's Digimon with the lowest DP as the bottom security card",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST22-06", compiled);
