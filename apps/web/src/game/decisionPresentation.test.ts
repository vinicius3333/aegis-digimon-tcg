import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type DecisionRequest, type Seat } from "@aegis/shared";
import {
  decisionPresentation,
  fieldSlots,
  sourcePermanentIdOf,
  triggerClauseSummary,
  triggerSource,
} from "./decisionPresentation";

function decision(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  return {
    decisionId: "d1",
    seat: 0,
    kind: "selectCards",
    promptText: "Select 1 card to trash.",
    ...overrides,
  };
}

function permanent(permanentId: string, cardId: string, stackCardIds: readonly string[] = [], seat: Seat = 0) {
  const perm = new Permanent();
  perm.permanentId = permanentId;
  perm.controllerSeat = seat;
  const top = new CardInstance();
  top.instanceId = `${permanentId}-top`;
  top.cardId = cardId;
  perm.topCard = top;
  perm.stack.push(
    ...stackCardIds.map((id, index) => {
      const card = new CardInstance();
      card.instanceId = `${permanentId}-under-${index}`;
      card.cardId = id;
      return card;
    }),
  );
  return perm;
}

describe("decisionPresentation", () => {
  const hand = ["h1", "h2", "h3"];

  it("puts a hand-only selectCards decision on the board", () => {
    const request = decision({ options: { candidateInstanceIds: ["h1", "h2"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("board");
  });

  it("keeps the dialog when a candidate lives outside the hand", () => {
    const request = decision({ options: { candidateInstanceIds: ["h1", "deck-1"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
  });

  it("keeps the dialog when a visible-only card cannot be shown on the board", () => {
    const request = decision({
      options: { candidateInstanceIds: ["h1"], visibleInstanceIds: ["h1", "revealed-1"], min: 1, max: 1 },
    });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
  });

  it("keeps the dialog when nothing is selectable", () => {
    const request = decision({ options: { candidateInstanceIds: [], min: 0, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
  });

  it("puts an optional decision on the board when its source is on the field", () => {
    const request = decision({ kind: "optional" });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, sourcePermanentId: "p1" })).toBe("board");
  });

  it("falls back to the dialog when the optional decision's source is not on the board", () => {
    expect(decisionPresentation({ decision: decision({ kind: "optional" }), handInstanceIds: hand })).toBe("dialog");
  });

  it.each(["chooseTargets", "orderCards", "orderTriggers", "chooseOption", "mulligan"] as const)(
    "renders %s in the dialog",
    (kind) => {
      const request = decision({ kind, options: { candidateInstanceIds: ["h1"], min: 1, max: 1 } });
      expect(decisionPresentation({ decision: request, handInstanceIds: hand, sourcePermanentId: "p1" })).toBe(
        "dialog",
      );
    },
  );
});

describe("sourcePermanentIdOf", () => {
  const permanents = [permanent("p1", "ST1-07"), permanent("p2", "ST1-09", ["ST1-03"])];

  it("finds the permanent whose face-up card raised the decision", () => {
    expect(sourcePermanentIdOf("ST1-09", permanents)).toBe("p2");
  });

  it("ignores cards buried in a digivolution stack", () => {
    expect(sourcePermanentIdOf("ST1-03", permanents)).toBeUndefined();
  });

  it("returns nothing without a source card", () => {
    expect(sourcePermanentIdOf(undefined, permanents)).toBeUndefined();
  });
});

describe("triggerClauseSummary", () => {
  it("drops timing brackets and collapses whitespace", () => {
    expect(triggerClauseSummary("[On Play]  Draw 1 card.")).toBe("Draw 1 card.");
  });

  it("returns nothing for a clause with no body", () => {
    expect(triggerClauseSummary("[On Play] [When Digivolving]")).toBeUndefined();
    expect(triggerClauseSummary(undefined)).toBeUndefined();
  });

  it("truncates on a word boundary", () => {
    const summary = triggerClauseSummary("Delete 1 of your opponent's Digimon with 5000 DP or less, then draw 1 card.");
    expect(summary?.endsWith("…")).toBe(true);
    expect(summary?.length).toBeLessThanOrEqual(65);
    expect(summary).not.toMatch(/\s…$/);
    expect("Delete 1 of your opponent's Digimon with 5000 DP or less, then draw 1 card.").toContain(
      summary!.replace("…", ""),
    );
  });

  it("hard-cuts a single word longer than the budget", () => {
    expect(triggerClauseSummary("A".repeat(100), 10)).toBe(`${"A".repeat(10)}…`);
  });
});

describe("triggerSource", () => {
  const slots = fieldSlots([permanent("p1", "ST1-07"), permanent("p2", "ST1-09", ["ST1-03"])]);

  it("names the 1-based battle-area slot of a face-up source", () => {
    expect(triggerSource("p2-top", { fieldSlots: slots, handInstanceIds: [] })).toEqual({ zone: "field", position: 2 });
  });

  it("resolves an inherited source to the slot that carries it", () => {
    expect(triggerSource("p2-under-0", { fieldSlots: slots, handInstanceIds: [] })).toEqual({
      zone: "field",
      position: 2,
    });
  });

  it("recognizes a hand source", () => {
    expect(triggerSource("h1", { fieldSlots: slots, handInstanceIds: ["h1"] })).toEqual({ zone: "hand" });
  });

  it("reports an unplaced source rather than guessing", () => {
    expect(triggerSource("gone", { fieldSlots: slots, handInstanceIds: [] })).toEqual({ zone: "unknown" });
  });
});
