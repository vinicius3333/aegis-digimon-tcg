import { describe, expect, it } from "vitest";
import { compiledEffects, type Action } from "@aegis/shared";
import { allowsOptionalProcessingCostWithoutTarget } from "./processingCondition.js";

function collectPrintedByActions(value: unknown, actions: Action[]): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectPrintedByActions(entry, actions);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const candidate = value as Partial<Action> & Record<string, unknown>;
  const additionalCosts = Array.isArray(candidate.additionalCosts) ? candidate.additionalCosts : [];
  const costs: unknown[] = [candidate.cost, candidate.additionalCost, ...additionalCosts];
  if (
    candidate.optional === true &&
    costs.some(
      (cost) =>
        cost !== null &&
        typeof cost === "object" &&
        "raw" in cost &&
        typeof cost.raw === "string" &&
        /^\s*by\b/i.test(cost.raw),
    )
  ) {
    actions.push(candidate as Action);
  }
  for (const entry of Object.values(candidate)) collectPrintedByActions(entry, actions);
}

describe("optional processing-condition classification", () => {
  it("recognizes every compiled optional cost whose printed wording starts with By", () => {
    const actions: Action[] = [];
    collectPrintedByActions(compiledEffects, actions);

    expect(actions.length).toBeGreaterThan(1000);
    expect(actions.every(allowsOptionalProcessingCostWithoutTarget)).toBe(true);
  });
});
