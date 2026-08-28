import type { DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { acknowledgeDecisionResponse, reconcileDecisionPatch, type DecisionSyncState } from "./useRoom";

const search: DecisionRequest = {
  decisionId: "dec-1",
  seat: 0,
  kind: "selectCards",
  promptText: "Choose searched cards",
};

const ordering: DecisionRequest = {
  decisionId: "dec-2",
  seat: 0,
  kind: "orderCards",
  promptText: "Choose the card order",
  options: { candidateInstanceIds: ["rest-a", "rest-b", "rest-c"] },
};

const mulligan: DecisionRequest = {
  decisionId: "mull-1",
  seat: 0,
  kind: "mulligan",
  promptText: "Keep your opening hand?",
};

describe("decision message/state synchronization", () => {
  it("clears the answered modal immediately even when the clearing patch arrived first", () => {
    expect(
      acknowledgeDecisionResponse({
        current: { decision: search, confirmedDecisionId: undefined },
        decisionId: search.decisionId,
      }),
    ).toEqual({ decision: undefined, confirmedDecisionId: undefined });
  });

  it("clears the human mulligan locally while the bot answers its own mulligan", () => {
    expect(
      acknowledgeDecisionResponse({
        current: { decision: mulligan, confirmedDecisionId: mulligan.decisionId },
        decisionId: mulligan.decisionId,
      }),
    ).toEqual({ decision: undefined, confirmedDecisionId: undefined });
  });

  it("does not clear a newer modal when acknowledging an older decision", () => {
    expect(
      acknowledgeDecisionResponse({
        current: { decision: ordering, confirmedDecisionId: undefined },
        decisionId: search.decisionId,
      }),
    ).toEqual({ decision: ordering, confirmedDecisionId: undefined });
  });

  it("keeps a newly received ordering modal through a late patch that clears the search", () => {
    const receivedOrdering: DecisionSyncState = {
      decision: ordering,
      confirmedDecisionId: undefined,
    };

    const afterLateSearchPatch = reconcileDecisionPatch({
      current: receivedOrdering,
      pendingDecisionId: undefined,
    });

    expect(afterLateSearchPatch.decision).toEqual(ordering);
    expect(afterLateSearchPatch.confirmedDecisionId).toBeUndefined();
  });

  it("clears a decision only after that exact id was synchronized and later disappears", () => {
    const receivedSearch: DecisionSyncState = {
      decision: search,
      confirmedDecisionId: undefined,
    };

    const confirmedSearch = reconcileDecisionPatch({
      current: receivedSearch,
      pendingDecisionId: search.decisionId,
    });
    expect(confirmedSearch.confirmedDecisionId).toBe(search.decisionId);

    expect(
      reconcileDecisionPatch({
        current: confirmedSearch,
        pendingDecisionId: undefined,
      }),
    ).toEqual({ decision: undefined, confirmedDecisionId: undefined });
  });
});
