import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type DecisionRequest, type Seat } from "@aegis/shared";
import {
  decisionPresentation,
  effectDecisionSurface,
  isFieldTargetDecision,
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

  it("distinguishes field effect targets from costs, zone selections, and attack declarations", () => {
    const field = [permanent("target", "BT1-010")];
    const targets = decision({ options: { candidateInstanceIds: ["target"] } });
    expect(isFieldTargetDecision(targets, field)).toBe(true);
    expect(isFieldTargetDecision({ ...targets, options: { ...targets.options, purpose: "cost" } }, field)).toBe(false);
    expect(isFieldTargetDecision({ ...targets, options: { candidateInstanceIds: ["h1"] } }, field)).toBe(false);
    expect(
      isFieldTargetDecision({ ...targets, options: { ...targets.options, selectionContext: "attackTarget" } }, field),
    ).toBe(false);
  });

  it("routes a field-only selection to the physical cards on the board", () => {
    const request = decision({
      promptText: "＜Decoy＞: delete this Digimon to prevent deletion?",
      options: { candidateInstanceIds: ["plain", "stacked"], min: 0, max: 1 },
    });
    expect(
      decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["plain", "stacked"] }),
    ).toBe("board");
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["plain"] })).toBe(
      "dialog",
    );
    expect(
      decisionPresentation({
        decision: { ...request, promptText: "Choose a card to gain ＜Decoy＞" },
        handInstanceIds: hand,
        fieldInstanceIds: ["plain", "stacked"],
      }),
    ).toBe("board");
  });

  it("Discord 1556882561995644928: chooses effect targets directly on the field", () => {
    const request = decision({
      kind: "chooseTargets",
      options: { candidateInstanceIds: ["mine", "theirs"], min: 1, max: 1 },
    });
    expect(
      decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["mine", "theirs"] }),
    ).toBe("board");
  });

  it("recognizes both permanent and top-card identities, including visible noncandidates", () => {
    const request = decision({
      kind: "chooseTargets",
      options: { candidateInstanceIds: ["target-top"], visibleInstanceIds: ["target-top", "other"], min: 0, max: 1 },
    });
    expect(
      decisionPresentation({
        decision: request,
        handInstanceIds: hand,
        fieldInstanceIds: ["target", "target-top", "other"],
      }),
    ).toBe("board");
    expect(
      decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["target", "target-top"] }),
    ).toBe("dialog");
  });

  it.each([
    { assemblyCardId: "BT26-014" },
    { digiXrosCardId: "BT10-009" },
    { selectionContext: "partitionActivation" as const },
  ])("retains dedicated material dialogs even for field-only pools (%j)", (options) => {
    const request = decision({ options: { candidateInstanceIds: ["field"], min: 0, max: 1, ...options } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["field"] })).toBe(
      "dialog",
    );
  });

  it("keeps mixed-zone chooseTargets decisions in the dialog", () => {
    const request = decision({
      kind: "chooseTargets",
      options: { candidateInstanceIds: ["field", "trash"], min: 1, max: 1 },
    });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["field"] })).toBe(
      "dialog",
    );
  });

  it("puts an attack-target choice spanning security and the field in the central dialog", () => {
    const request = decision({
      kind: "selectCards",
      options: {
        candidateInstanceIds: ["player", "defender"],
        min: 1,
        max: 1,
        selectionContext: "attackTarget",
      },
    });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, fieldInstanceIds: ["defender"] })).toBe(
      "dialog",
    );
  });

  it.each(["selectCards", "chooseTargets"] as const)("picks hand-only %s decisions in the physical hand", (kind) => {
    const request = decision({ kind, options: { candidateInstanceIds: ["h1", "h2"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("board");
  });

  it("keeps visible ineligible hand cards beside the highlighted candidates", () => {
    const request = decision({
      options: { candidateInstanceIds: ["h1"], visibleInstanceIds: ["h1", "h2", "h3"], min: 0, max: 1 },
    });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("board");
  });

  it.each([
    { assemblyCardId: "BT26-014" },
    { digiXrosCardId: "BT10-009" },
    { selectionContext: "partitionActivation" as const },
    { selectionContext: "attackTarget" as const },
  ])("preserves dedicated material and attack dialogs (%j)", (options) => {
    const request = decision({ options: { candidateInstanceIds: ["h1"], min: 1, max: 1, ...options } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
  });

  it("does not confuse a printed card id with a physical card in the viewer's hand", () => {
    const request = decision({ options: { candidateInstanceIds: ["ST1-07"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
  });

  it("keeps an opponent's hidden hand candidate in the dialog", () => {
    const request = decision({ options: { candidateInstanceIds: ["opponent-hand"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand })).toBe("dialog");
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

  it.each(["orderCards", "orderTriggers", "chooseOption", "mulligan"] as const)("renders %s in the dialog", (kind) => {
    const request = decision({ kind, options: { candidateInstanceIds: ["h1"], min: 1, max: 1 } });
    expect(decisionPresentation({ decision: request, handInstanceIds: hand, sourcePermanentId: "p1" })).toBe("dialog");
  });
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

it("uses the optional decision's physical source for duplicate field cards", () => {
  const permanents = [
    { permanentId: "first", topCard: { cardId: "BT26-009", instanceId: "copy-1" } },
    { permanentId: "second", topCard: { cardId: "BT26-009", instanceId: "copy-2" } },
  ] as unknown as Permanent[];
  expect(sourcePermanentIdOf("BT26-009", permanents, { sourcePermanentId: "second", sourceInstanceId: "copy-2" })).toBe(
    "second",
  );
});

describe("effect decision surface", () => {
  it.each(["chooseTargets", "selectCards", "orderCards", "orderTriggers", "mulligan"] as const)(
    "Discord 1557059213266522233: centers %s card choices regardless of source zone",
    (kind) => expect(effectDecisionSurface(decision({ kind }))).toBe("center"),
  );

  it("keeps optional activation and simple choices on the left", () => {
    expect(effectDecisionSurface(decision({ kind: "optional" }))).toBe("left");
    expect(effectDecisionSurface(decision({ kind: "chooseOption", options: { choices: ["Use", "Don't use"] } }))).toBe(
      "left",
    );
    expect(effectDecisionSurface(decision({ options: { selectionContext: "partitionActivation" } }))).toBe("left");
  });

  it("docks choices between printed effects on the left", () => {
    expect(
      effectDecisionSurface(
        decision({
          kind: "chooseOption",
          options: { choices: ["First", "Second"], choiceEffects: [{ cardId: "BT1-010" }, { cardId: "BT1-011" }] },
        }),
      ),
    ).toBe("left");
  });
});
