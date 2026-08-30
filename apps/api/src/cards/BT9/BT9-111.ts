// @ts-nocheck
// HAND-FIXED IR for BT9-111 (Alphamon: Ouryuken) — do not regenerate over this file.
//
// runtime-effect fixes:
//  1. digivolutionRequirement: the printed "Digivolve: 3 from [Alphamon] w/[Ouryumon]
//     digivolution card" gates on BOTH the base's name AND a digivolution-stack NAME
//     gate (the base must already have a card named Ouryumon stacked under it), not
//     name alone. Uses the exact namesExact base gate and the new minNameStackCount/
//     minNameStackNames fields (the NAME-based
//     sibling of the existing minTraitStackCount/minTraitStackTraits gate), enforced in
//     apps/api/src/engine/actions/digivolve.ts.
//  2. [End of Your Turn]: the Return of up to 7 [X Antibody] cards from THIS Digimon's
//     digivolution cards used an invalid Filter.kind:["Card"] (not a real CardKind) and
//     resolved as a battle-area-permanent target instead of a loose digivolution-stack
//     source, so it always matched nothing. Fixed to zone:"digivolutionCards" +
//     hostFilter:{isSelfRef:true} (restricts to THIS permanent's own stack, not any of
//     the controller's Digimon). The GainMemory's scaling also miscounted "for each card
//     returned" via a live board recount (filter:{controllerDefault:"mine"}, unit:"cards"
//     — counts ALL of the controller's battle-area permanents) instead of the actual
//     return count; fixed via Return.trackCount + GainMemory scaling unit:"namedCount".
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              hostFilter: {
                isSelfRef: true,
              },
              nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
              excludeKind: ["Digi-Egg"],
            },
            count: 7,
            upTo: true,
          },
          to: "deckBottom",
          order: "any",
          optional: true,
          trackCount: "bt9-111-returned",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "bt9-111-returned",
            count: 1,
          },
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "bt9-111-returned",
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
      namesExact: ["Alphamon"],
      cost: 3,
      isAlternate: true,
      minNameStackCount: 1,
      minNameStackNames: ["Ouryumon"],
    },
  ],
};

registerIrCard("BT9-111", compiled);
