import { describe, expect, it } from "vitest";
import type { ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { buildDecisionExplanation } from "@/replays/analysis/buildDecisionExplanation";

function createDecision(chosen: number): ReplayDecisionPoint {
  return {
    frameIndex: 3,
    inputIndex: 9,
    seat: 0,
    turn: 4,
    context: "main",
    chosen: [chosen],
    bestOption: 1,
    options: [
      { action: "endPhase", value: 0.3, factors: { security: -0.2, board: -1, hand: 0.5, memory: 0.4 } },
      {
        action: "play",
        cardId: "BT1-010",
        value: 0.6,
        factors: { security: 0.5, board: 0.2, hand: 0.49, memory: 0.1 },
      },
      { action: "play", cardId: "BT1-011", value: 0.5, factors: { security: 0.1, board: 0, hand: 0.5, memory: 0.4 } },
      { action: "attackPlayer", cardId: "BT1-012" },
    ],
  };
}

describe("decision explanation", () => {
  it("compares the chosen option with the best one and keeps the factors that differ most", () => {
    const explanation = buildDecisionExplanation({ decision: createDecision(0) })!;

    expect(explanation.reference.cardId).toBe("BT1-010");
    expect(explanation.referenceIsBest).toBe(true);
    expect(explanation.factors.map(({ factor }) => factor)).toEqual(["board", "security", "memory"]);
    expect(explanation.factors[0]!.difference).toBeCloseTo(1.2, 6);
  });

  it("compares a best choice with the runner-up and skips options the bot did not play out", () => {
    const explanation = buildDecisionExplanation({ decision: createDecision(1) })!;

    expect(explanation.reference.cardId).toBe("BT1-011");
    expect(explanation.referenceIsBest).toBe(false);
    expect(explanation.factors.every(({ difference }) => Math.abs(difference) >= 0.01)).toBe(true);
  });

  it("has nothing to explain when the decision was not rated", () => {
    expect(buildDecisionExplanation({ decision: { ...createDecision(0), bestOption: undefined } })).toBeUndefined();
  });
});
