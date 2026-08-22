// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-073")!;
const deletedCountSource = "ex6-073-deleted";

/** EX6-073 — Ogudomon, with the 7-minus-deleted security count structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => ({
    ...effect,
    actions: effect.actions.map((action) => {
      if (action.kind === "Delete") {
        return { ...action, target: { ...action.target, upTo: true }, trackCount: deletedCountSource };
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
