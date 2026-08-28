// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-051 (Panjyamon X Antibody).
// KB Q1848: "(Rule) Name: Also treated as having [Leomon]" — the (Rule) ALWAYS applies;
// it allows this card to be chosen for text that specifies cards with [Leomon] in their names.
// The digivolutionRequirement names must NOT include "Leomon" (only "Panjyamon") — the name
// grant is a (Rule), not an alternate evo requirement name.
//
// Corrections:
// - Removed "Leomon" from digivolutionRequirement.names (only Panjyamon per printed text).
// - Added Rule GrantStatic name: "Leomon" to encode the continuous (Rule) name alias.
// - "would be deleted in battle" is enforced by leaveCause:"byBattle" on the
//   replacement subscription. Effect deletion therefore cannot play the source.
// - PlayWithoutCost from this Digimon's digivolution cards targets the exact name "Leomon";
//   KB Q1848 says
//   the (Rule) does NOT allow this card to be chosen for "the name [Leomon]" text, so
//   filtering to name "Leomon" is correct (excludes this card itself as a target).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "name",
          tokens: ["Leomon"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "instead",
          leaveCause: "byBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Leomon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
          ],
          raw: "when this Digimon would be deleted in battle, you may play 1 [Leomon] from this Digimon's digivolution cards without paying its memory cost",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Panjyamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-051", compiled);
