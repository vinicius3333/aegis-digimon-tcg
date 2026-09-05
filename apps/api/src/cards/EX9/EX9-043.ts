import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX9-043 MetalTyrannomon (hand-authored override of the runtime record IR).
//
// The pay-time interactive cost-reduction clause ("When this card would be played, by trashing 1
// [Cyborg]/[Ver.5] trait card from your hand, reduce the play cost by 2") is the previously-flagged
// missing-primitive(interactive-play-cost-reduction) residual. It is now authored as a BeforePayCost
// effect carrying a ReducePlayCost action — the play action fires this window for the in-hand card
// before paying, runs the OPTIONAL trash payment SERVER-SIDE, and floors the −2 delta into the cost.
//
// Source (behavior reference): documented behavior — `if (timing == EffectTiming.BeforePayCost)` builds an
// rule implementation of −2 (canNoSelect = true => the trash is optional; KB Q4796 it is usable even
// when the card is played without paying its cost). The digivolution-cost reduction to 3 for Lv.4
// Tyrannomon/[DM] is modeled via `digivolutionRequirement`; the On Play / When Digivolving
// place-under + delete clauses are authored unchanged below.
export const compiled: CompiledCard = {
  effects: [
    {
      // "When this card would be played, by trashing 1 [Cyborg]/[Ver.5] trait card from your
      // hand, reduce the play cost by 2." (documented behavior BeforePayCost branch.)
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "trashFromHand",
            filter: {
              controller: "mine",
              zone: "hand",
              nameOrTrait: [
                { tokens: ["Cyborg"], match: "trait" },
                { tokens: ["Ver.5"], match: "trait" },
              ],
            },
          },
          amount: { kind: "fixed", value: 2 },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          // "By placing 1 Digimon card from your trash face down as this Digimon's bottom
          // digivolution card" — PlaceUnder is the "by" cost gating all subsequent actions.
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            from: ["trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          faceDown: true,
          // "By placing ..." — a declinable cost; declining aborts the De-Digivolve + delete tail.
          optional: true,
          abortOnDecline: true,
        },
        {
          // "to 1 of your opponent's Digimon, <De-Digivolve 1> for each of this Digimon's
          // face-down digivolution cards" — amount is dynamic.
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: { kind: "countFaceDownDigivolutionCards", host: "self" },
        },
        {
          // "Then, delete 1 of your opponent's 3000 DP or lower Digimon"
          // conditional on the "by" cost having been paid (PlaceUnder succeeded).
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            from: ["trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          faceDown: true,
          // "By placing ..." — a declinable cost; declining aborts the De-Digivolve + delete tail.
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: { kind: "countFaceDownDigivolutionCards", host: "self" },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      isInherited: true,
      keywords: [],
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Piercing",
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 3,
      isAlternate: true,
      level: 4,
      names: ["Tyrannomon"],
    },
    {
      cost: 3,
      isAlternate: true,
      traits: ["DM"],
      level: 4,
    },
  ],
};

registerIrCard("EX9-043", compiled);
