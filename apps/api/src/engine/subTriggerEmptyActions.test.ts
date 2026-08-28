import { describe, it, expect } from "vitest";
import { getCompiledCard } from "@aegis/shared";
// Self-register every compiled-IR card module so getCompiledCard resolves real definitions.
import "../cards/index.js";

/**
 * Regression for SubTrigger empty-actions bug — runtime record-sourced Tamer cards with
 * "When [X] is deleted, by suspending this Tamer, <payoff>" produced a SubTrigger with
 * `actions: []` and the payoff description only in `cost.raw`. The payoff action was
 * never emitted into the actions array, leaving the triggered behavior completely inert.
 *
 * FAILS-WHEN-REVERTED: Restore `"actions": []` on EX4-064 effects[1].actions[0].actions
 * and EX11-055 effects[2].actions[0].actions => RED.
 */

function findOnDeletionSubTrigger(cardId: string): Record<string, unknown> | undefined {
  const compiled = getCompiledCard(cardId);
  if (compiled === undefined) return undefined;
  let found: Record<string, unknown> | undefined;
  const visit = (a: unknown): void => {
    if (Array.isArray(a)) {
      for (const x of a) visit(x);
    } else if (a !== null && typeof a === "object") {
      const obj = a as Record<string, unknown>;
      if (obj.kind === "SubTrigger" && obj.event === "onDeletionOf" && found === undefined) {
        found = obj;
      }
      for (const v of Object.values(obj)) visit(v);
    }
  };
  visit(compiled.effects);
  return found;
}

describe("SubTrigger onDeletionOf has non-empty actions array", () => {
  it("EX4-064 Keenan Crier: Draw 1 card action present in SubTrigger actions", () => {
    const st = findOnDeletionSubTrigger("EX4-064");
    expect(st).toBeDefined();
    const actions = st!.actions as unknown[];
    expect(actions.length).toBeGreaterThan(0);
    const draw = actions.find((a) => (a as Record<string, unknown>).kind === "Draw");
    expect(draw).toBeDefined();
    expect((draw as Record<string, unknown>).amount).toBe(1);
  });

  it("EX4-064 Keenan Crier: GainMemory inside SubTrigger actions (not alongside)", () => {
    const st = findOnDeletionSubTrigger("EX4-064");
    expect(st).toBeDefined();
    const actions = st!.actions as unknown[];
    const mem = actions.find((a) => (a as Record<string, unknown>).kind === "GainMemory");
    expect(mem).toBeDefined();
  });

  it("EX11-055 Chitose Horaiji: PlayWithoutCost action present in SubTrigger actions", () => {
    const st = findOnDeletionSubTrigger("EX11-055");
    expect(st).toBeDefined();
    const actions = st!.actions as unknown[];
    expect(actions.length).toBeGreaterThan(0);
    const play = actions.find((a) => (a as Record<string, unknown>).kind === "PlayWithoutCost");
    expect(play).toBeDefined();
    expect((play as Record<string, unknown>).payCost).toBe(false);
    expect((play as Record<string, unknown>).optional).toBe(true);
  });
});
