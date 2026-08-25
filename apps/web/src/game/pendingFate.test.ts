import { describe, expect, it } from "vitest";
import { TARGET_FATES, type DecisionRequest } from "@aegis/shared";
import { pendingFateBadge, pendingFateBadges } from "./pendingFate";

function targetDecision(options: DecisionRequest["options"] = {}): DecisionRequest {
  return { decisionId: "d1", seat: 0, kind: "chooseTargets", promptText: "Card", options };
}

describe("pendingFateBadge", () => {
  it("names a badge for every fate the protocol defines", () => {
    for (const fate of TARGET_FATES) {
      const badge = pendingFateBadge(fate);
      expect(badge.labelKey, fate).toBe(`game.fate.${fate}`);
      expect(badge.glyph.length, fate).toBeGreaterThan(0);
    }
  });

  it("paints a deletion and a move in different tones", () => {
    expect(pendingFateBadge("delete").tone).toBe("danger");
    expect(pendingFateBadge("returnToHand").tone).toBe("neutral");
    expect(pendingFateBadge("digivolve").tone).toBe("good");
  });
});

describe("pendingFateBadges", () => {
  const decision = targetDecision({ candidateInstanceIds: ["p1", "p2"], targetFate: "delete" });

  it("badges the picked targets only", () => {
    const badges = pendingFateBadges({ decision, picks: ["p1"], viewerSeat: 0 });
    expect([...badges.keys()]).toEqual(["p1"]);
    expect(badges.get("p1")?.fate).toBe("delete");
  });

  it("says nothing about a candidate that has not been picked", () => {
    // A candidate is a card the effect COULD reach; badging it would claim
    // something the server never said.
    expect(pendingFateBadges({ decision, picks: [], viewerSeat: 0 }).size).toBe(0);
  });

  it("ignores a pick the server never offered", () => {
    expect(pendingFateBadges({ decision, picks: ["p9"], viewerSeat: 0 }).size).toBe(0);
  });

  it("badges nothing when the prompt carries no projected fate", () => {
    const noFate = targetDecision({ candidateInstanceIds: ["p1"] });
    expect(pendingFateBadges({ decision: noFate, picks: ["p1"], viewerSeat: 0 }).size).toBe(0);
  });

  it("badges nothing for another kind of decision, another seat, or no decision", () => {
    const selectCards: DecisionRequest = { ...decision, kind: "selectCards" };
    expect(pendingFateBadges({ decision: selectCards, picks: ["p1"], viewerSeat: 0 }).size).toBe(0);
    expect(pendingFateBadges({ decision, picks: ["p1"], viewerSeat: 1 }).size).toBe(0);
    expect(pendingFateBadges({ decision: undefined, picks: ["p1"], viewerSeat: 0 }).size).toBe(0);
  });
});
