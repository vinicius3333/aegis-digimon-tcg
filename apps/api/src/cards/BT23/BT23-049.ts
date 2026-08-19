import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-049 Monodramon (hand-authored override of the runtime record IR).
//
// The [Start of Your Main Phase] clause compiled to an empty `actions: []` (silent no-op):
// its "By trashing 1 card with the [Dragonkin], [Cyborg], [Device] or [CS] trait from your
// hand" cost was truncated at the first trait-list comma (comma-truncation bug now fixed in
// runtime effect records).
//
// "..., ＜Draw 1＞ and gain 1 memory" is ONE cost gating TWO payloads. The engine has no
// clause-level cost (cost is per-action), and the prose compiler distributes the cost onto
// every split action — which would trash one card PER payload (two trashes). Modeled here
// with the single trash cost on the Draw and the GainMemory uncosted, so exactly one card is
// trashed. (A future engine clause-cost/abort-propagation would let the memory gain be gated
// too; today an empty-hand player still gains 1 memory — an acceptably minor over-grant on a
// beneficial optional ability.) The inherited [All Turns] +1000 DP and the alt-digivolution
// requirement compiled correctly and are carried through unchanged.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg", "Device", "CS"], match: "trait" }],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Dragonkin], [Cyborg], [Device] or [CS] trait from your hand",
          },
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }],
};

registerIrCard("BT23-049", compiled);
