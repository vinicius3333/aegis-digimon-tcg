import { describe, expect, it } from "vitest";
import type { DecisionRequest, Intent } from "@aegis/shared";
import { chooseDecisionIntent, type DecisionStep, type SelectionCard } from "./decisions.js";

function leaves(request: DecisionRequest, cards: ReadonlyMap<string, SelectionCard> = new Map()): Intent[] {
  const outcomes: Intent[] = [];
  function visit(path: number[]): void {
    let position = 0;
    let branch: DecisionStep | undefined;
    const pause = new Error("branch");
    try {
      outcomes.push(
        chooseDecisionIntent(request, cards, (step) => {
          if (position === path.length) {
            branch = step;
            throw pause;
          }
          return path[position++]!;
        }),
      );
    } catch (error) {
      if (error !== pause) throw error;
      for (let index = 0; index < branch!.choices.length; index++) visit([...path, index]);
    }
  }
  visit([]);
  return outcomes;
}

function makeRequest(kind: DecisionRequest["kind"], options?: DecisionRequest["options"]): DecisionRequest {
  return { decisionId: "choice-1", seat: 0, kind, promptText: "Test", options };
}

describe("training decision action space", () => {
  it("exposes accept, decline, mulligan, every mode, and every next trigger", () => {
    expect(leaves(makeRequest("optional"))).toHaveLength(2);
    expect(leaves(makeRequest("mulligan"))).toEqual([
      { type: "mulligan", keep: true },
      { type: "mulligan", keep: false },
    ]);
    expect(leaves(makeRequest("chooseOption", { choices: ["A", "B", "Decline"], declineIndex: 2 }))).toHaveLength(3);
    expect(leaves(makeRequest("orderTriggers", { triggerKeys: ["A", "B"], acceptsResolutionPlan: true }))).toEqual([
      { type: "respondDecision", decisionId: "choice-1", response: { kind: "orderTriggers", order: ["A"] } },
      { type: "respondDecision", decisionId: "choice-1", response: { kind: "orderTriggers", order: ["B"] } },
    ]);
  });

  it("makes all 24 card orders reachable without offering permutations as atomic actions", () => {
    const results = leaves(makeRequest("orderCards", { candidateInstanceIds: ["A", "B", "C", "D"] }));
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(24);
  });

  it("offers every ordered subset including stopping early and declining", () => {
    const results = leaves(makeRequest("selectCards", { candidateInstanceIds: ["A", "B", "C"], min: 0, max: 2 }));
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(10);
    expect(results).toContainEqual({
      type: "respondDecision",
      decisionId: "choice-1",
      response: { kind: "selectCards", instanceIds: [] },
    });
  });

  it("does not offer a first pick that cannot complete a mandatory joint cost", () => {
    const cards = new Map<string, SelectionCard>([
      ["A", { playCost: 4 }],
      ["B", { playCost: 2 }],
      ["C", { playCost: 2 }],
    ]);
    const windows: string[][] = [];
    const result = chooseDecisionIntent(
      makeRequest("chooseTargets", { candidateInstanceIds: ["A", "B", "C"], min: 2, max: 2, maxTotalPlayCost: 4 }),
      cards,
      (step) => {
        windows.push(step.choices.map((choice) => choice.key));
        return 0;
      },
    );
    expect(windows).toEqual([["B", "C"], ["C"], ["finish"]]);
    expect(result).toEqual({
      type: "respondDecision",
      decisionId: "choice-1",
      response: { kind: "chooseTargets", instanceIds: ["B", "C"] },
    });
  });

  it("enforces DP, printed IDs, and overlapping exact-name aliases", () => {
    const cards = new Map<string, SelectionCard>([
      ["A", { cardId: "C1", dp: 3000, colors: ["Red", "Blue"], names: ["First", "Alias"] }],
      ["B", { cardId: "C1", dp: 5000, colors: ["Blue"], names: ["Second", "Alias"] }],
      ["C", { cardId: "C2", dp: 4000, colors: ["Yellow"], names: ["Third"] }],
    ]);
    for (const constraint of [{ distinctCardIds: true }, { distinctNames: true }, { maxTotalDP: 7000 }]) {
      const results = leaves(
        makeRequest("selectCards", { candidateInstanceIds: ["A", "B", "C"], min: 2, max: 2, ...constraint }),
        cards,
      );
      for (const result of results) {
        expect(result.type).toBe("respondDecision");
        if (result.type !== "respondDecision" || result.response.kind !== "selectCards")
          throw new Error("wrong response");
        expect(result.response.instanceIds.sort()).not.toEqual(["A", "B"]);
      }
      expect(results.length).toBeGreaterThan(0);
    }
  });

  it("permits distinct assignments for overlapping multicolor cards but rejects impossible triples", () => {
    const cards = new Map<string, SelectionCard>(["A", "B", "C"].map((id) => [id, { colors: ["Red", "Blue"] }]));
    const options = { candidateInstanceIds: ["A", "B", "C"], min: 2, max: 3, differentColors: true };
    const results = leaves(makeRequest("selectCards", options), cards);
    expect(results).toHaveLength(6);
    for (const result of results) {
      if (result.type !== "respondDecision" || result.response.kind !== "selectCards")
        throw new Error("wrong response");
      expect(result.response.instanceIds).toHaveLength(2);
    }
    expect(() => leaves(makeRequest("selectCards", { ...options, min: 3 }), cards)).toThrow("No legal completion");
  });

  it("allows anonymous choices but never consults hidden identities for constraints", () => {
    expect(
      leaves(makeRequest("selectCards", { candidateInstanceIds: ["blind-1", "blind-2"], min: 1, max: 1 })),
    ).toHaveLength(2);
    expect(() =>
      leaves(makeRequest("selectCards", { candidateInstanceIds: ["blind-1"], min: 1, maxTotalPlayCost: 2 })),
    ).toThrow("Missing visible play cost");
  });

  it("fails explicitly on impossible completions and invalid model indexes", () => {
    expect(() => chooseDecisionIntent(makeRequest("chooseOption", { choices: ["One"] }), new Map(), () => 1)).toThrow(
      "Invalid action index",
    );
    expect(() => leaves(makeRequest("selectCards", { candidateInstanceIds: ["A"], min: 1, max: 0 }))).toThrow(
      "No legal completion",
    );
  });
});
