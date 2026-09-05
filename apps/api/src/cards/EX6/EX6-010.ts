// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-010")!;
const generatedMain = generated.effects.find((effect) => effect.trigger === "Main")!;
const generatedDisable = generated.effects.find((effect) => effect.trigger === "YourTurn")!;

/** EX6-010 — Durandamon, with its placement cost and security-disable clause structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => {
    if (effect === generatedMain) {
      return {
        ...effect,
        effectKey: "EX6-010/main-place-and-delete",
        actions: [
          {
            ...generatedMain.actions[0],
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                relativeTo: { attr: "dp", op: "lte", selectionRef: "placementTarget" },
              },
              count: 1,
            },
            cost: { kind: "payMemory", memory: 3, raw: "By paying 3 cost" },
            additionalCosts: [
              {
                kind: "place",
                target: { filter: { isSelfRef: true }, count: 1, from: ["hand"] },
                underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 } },
                underOrFilters: [
                  { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }] },
                ],
                destination: "digivolutionStack",
                position: "bottom",
                host: {
                  filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 } },
                  count: 1,
                  orFilters: [
                    { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 } },
                    {
                      controller: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }],
                    },
                  ],
                },
                bindHostAs: "placementTarget",
                raw: "and placing this card as the bottom digivolution card of 1 of your Digimon that's level 6 or has the [Legend-Arms] trait",
              },
            ],
            // The printed payment and self-placement form one activation condition.
            // Do not let the dependent Delete resolve if either half cannot be paid.
            abortOnDecline: true,
            raw: "By paying 3 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 6 or has the [Legend-Arms] trait, delete 1 of your opponent's Digimon with as much or less DP as that Digimon.",
          },
        ],
      };
    }
    if (effect === generatedDisable) {
      return {
        ...effect,
        actions: [
          {
            kind: "DisableSecurityEffect",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            sourceKind: "any",
            duration: "untilEachTurnEnd",
            condition: {
              kind: "selfHasName",
              names: ["RagnaLoardmon"],
              raw: "this Digimon is [RagnaLoardmon]",
            },
            raw: "the [Security] effects on cards checked by this Digimon don't activate",
          },
        ],
      };
    }
    return effect;
  }),
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-010", compiled);
