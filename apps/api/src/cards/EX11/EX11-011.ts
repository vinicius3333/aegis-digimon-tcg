// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX11-011 (Dinomon).
// runtime-effect fixes:
// - Text says "choose 1 of EACH player's Digimon with the highest play cost" (up to two
//   exemptions total, per Q5796), but the old IR's `Delete.target.except` picked a single
//   overall highest-play-cost Digimon across both sides — and `except` isn't even a field the
//   interpreter reads, so no exemption applied at all (it deleted everyone). Replaced with two
//   `SelectBind` picks (one per side, each scoped by `superlative: "highestPlayCost"`) feeding
//   a `Delete` whose filter excludes both bound selections via the new
//   `Filter.excludeSelectionRef` capability.
// - The "Then, choose ... and delete all other Digimon" clause is an unconditional consequence
//   of activating the effect (only the preceding Suspend is "may"); removed the stray
//   `optional: true` from the Delete action.
// - The opponent-turn attack rule uses the enforced attackOnlySuspendedDigimon aura. Q5797 says
//   it overrides a positive "can attack unsuspended" permission; Q5798 limits it to declaration;
//   Q5799 exempts Digimon unaffected by this source's effects.
// - Security Attack +1 and Fortitude are printed main keywords. This card has no inherited text.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        { keyword: "Fortitude", raw: "＜Fortitude＞" },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
            bindAs: "sparedMine",
            upTo: true,
          },
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
            bindAs: "sparedOpponent",
            upTo: true,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              excludeSelectionRef: ["sparedMine", "sparedOpponent"],
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
            bindAs: "sparedMine",
            upTo: true,
          },
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
            bindAs: "sparedOpponent",
            upTo: true,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              excludeSelectionRef: ["sparedMine", "sparedOpponent"],
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "attackOnlySuspendedDigimon",
          },
          while: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Tyrannomon"],
      cost: 4,
      isAlternate: true,
    },
    {
      traits: ["Dinosaur"],
      cost: 4,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("EX11-011", compiled);
