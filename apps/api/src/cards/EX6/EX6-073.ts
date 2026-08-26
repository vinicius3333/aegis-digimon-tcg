// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-073")!;
const deletedCountSource = "ex6-073-deleted";
const placedCountSource = "ex6-073-placed";

/** EX6-073 — Ogudomon, with the 7-minus-deleted security count structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => ({
    ...effect,
    actions: effect.actions
      .filter((action) => !(action.kind === "RawUnparsed" && action.text.includes("reduce the cards trashed by 1")))
      .map((action) => {
        if (action.kind === "PlaceUnder") {
          return {
            ...action,
            target: { ...action.target, distinctNames: true },
            trackCount: placedCountSource,
          };
        }
        if (action.kind === "Delete" && action.condition?.kind === "raw") {
          return {
            ...action,
            condition: { kind: "namedCountAtLeast", countSource: placedCountSource, count: 4 },
          };
        }
        if (action.kind === "Delete") {
          return {
            ...action,
            target: { ...action.target, upTo: true },
            cost:
              action.cost?.kind === "return"
                ? {
                      ...action.cost,
                      position: "bottom",
                      target: {
                        ...action.cost.target,
                        distinctNames: true,
                        filter: { ...action.cost.target.filter, zone: "digivolutionCards", sameHost: true },
                      },
                  }
                : action.cost,
            trackCount: deletedCountSource,
          };
        }
        if (action.kind === "SecurityManipulation" && action.op === "trashTop") {
          return {
            ...action,
            amount: undefined,
            amountFromNamedCount: { base: 7, countSource: deletedCountSource, per: -1, floor: 0 },
          };
        }
        return action;
      }),
  })),
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-073", compiled);
