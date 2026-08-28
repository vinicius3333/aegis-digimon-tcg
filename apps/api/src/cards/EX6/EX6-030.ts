// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-030")!;
const generatedWhenDigivolving = generated.effects.find((effect) => effect.trigger === "WhenDigivolving")!;

/** EX6-030 — Dominimon, with security search/play and security-cost prevention structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => {
    if (effect === generatedWhenDigivolving) {
      return {
        ...effect,
        actions: [
          {
            kind: "SearchSecurity",
            target: {
              filter: {
                zone: "security",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Angel", "Archangel"], match: "trait" }],
              },
              count: 1,
            },
            then: { kind: "PlayWithoutCost", source: "security", payCost: false, optional: true },
            raw: "Search your security stack. You may play 1 level 5 or lower Digimon card with the [Angel]/[Archangel] trait among them without paying the cost.",
          },
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -7000,
            duration: "untilEachTurnEnd",
          },
        ],
      };
    }
    if (effect.trigger === "AllTurns") {
      return {
        ...effect,
        actions: effect.actions.map((action) =>
          action.kind === "Replacement"
            ? {
                ...action,
                affectsAll: true,
                leaveCause: "otherThanBattle",
                cost: {
                  kind: "trashSecurityTop",
                  controller: "mine",
                  count: 1,
                  raw: "by trashing the top card of your security stack",
                },
              }
            : action,
        ),
      };
    }
    return effect;
  }),
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-030", compiled);
