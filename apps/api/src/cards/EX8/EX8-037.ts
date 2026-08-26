import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-IR override for EX8-037 Sakuyamon (X Antibody).
//
// KB Q3923: once you activate the used Option's effect, you process "if this effect used".
// KB Q4737: the unsuspend tail is MANDATORY after using an Option.
// KB Q4738: the tail still fires even if the Option digivolved this card away.
//
// UseOptionWithoutCost: the engine enforces single-color / cost≤5 / !prohibited SERVER-SIDE
// in runUseOptionWithoutCost, so the filter here carries only the Option kind.
//
// WhenDigivolving condition uses structured anyOf (name OR trait) against digivolution stack:
// the printed "[Sakuyamon]/[X Antibody]" slash is an OR, per comprehensive rules §15-7 (8.363),
// which glosses an identical "[WereGarurumon] or [X Antibody] is in this Digimon's digivolution
// cards" clause with "or" — not an AND of both criteria on one card.
//
// [Your Turn] body is gated by a SubTrigger("whenAttacking", sourceFilter: mine Digimon) —
// "when one of your Digimon attacks" — matching the BT15-010 IR pattern for the same clause.
//
// digivolutionRequirement: 'w/o [X Antibody] trait' exclusion via DigivolutionRequirement.excludeTraits.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: [{ name: "Uka no Mitama", keywords: [{ keyword: "Rush" }] }],
          count: 1,
          payCost: false,
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Sakuyamon"],
                      match: "name",
                    },
                  ],
                },
              },
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["X Antibody"],
                      match: "trait",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              filter: {
                controller: "mine",
                kind: ["Option"],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              raw: "you may use 1 1-color Option card with a use cost of 5 or less from your hand without paying the cost",
            },
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              condition: {
                kind: "ifThisEffectUsed",
                raw: "if you did (used an Option), 1 of your Digimon unsuspends (mandatory; KB Q4737)",
              },
            },
          ],
          raw: "when one of your Digimon attacks",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      names: ["Sakuyamon"],
      excludeTraits: ["X Antibody"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-037", compiled);
