// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DECISION_KINDS, type DecisionKind, type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { DecisionOverlay } from "./overlay";
import type { DecisionCandidate } from "./overlay/choice/decisionTypes";
import { decisionAllowsPick } from "./screen/model/decisionPicks";

afterEach(() => cleanup());

const GAME_DIR = dirname(fileURLToPath(import.meta.url));

type DecisionOptionKey = keyof NonNullable<DecisionRequest["options"]>;

/**
 * The web module that reads each option the engine can send. A new option added to
 * `DecisionRequest.options` fails typecheck here until someone names its consumer, so the
 * engine cannot ship a constraint the UI silently ignores (as `maxTotalDP` once was).
 * `null` marks an option no UI reads, with the reason beside it.
 */
const OPTION_CONSUMERS: Record<DecisionOptionKey, string | null> = {
  candidateInstanceIds: "screen/model/decisionView.ts",
  visibleInstanceIds: "decisionPresentation.ts",
  visibleCards: "decisionModel.ts",
  min: "decisionPresentation.ts",
  max: "overlay/choice/DecisionOverlay.tsx",
  maxTotalPlayCost: "overlay/choice/DecisionOverlay.tsx",
  maxTotalDP: "screen/model/decisionView.ts",
  differentColors: "screen/model/decisionView.ts",
  distinctCardIds: "screen/model/decisionView.ts",
  distinctNames: "screen/model/decisionView.ts",
  selectionContext: "trackingArrow.ts",
  orderDestination: "overlay/choice/DecisionOverlay.tsx",
  choices: "overlay/choice/DecisionOverlay.tsx",
  choiceEffects: "overlay/choice/DecisionOverlay.tsx",
  declineIndex: "overlay/choice/DecisionOverlay.tsx",
  triggerKeys: "screen/model/triggerDetails.ts",
  triggerCardIds: "screen/model/triggerDetails.ts",
  triggerTimings: "screen/model/triggerDetails.ts",
  triggerDescriptions: "screen/model/triggerDetails.ts",
  triggerIsInherited: "screen/model/triggerDetails.ts",
  triggerIsOptional: "overlay/choice/DecisionOverlay.tsx",
  acceptsResolutionPlan: "overlay/choice/DecisionOverlay.tsx",
  timing: "screen/model/triggerDetails.ts",
  effectText: "notices.ts",
  effectTextPart: "notices.ts",
  isInherited: "screen/layout/DecisionPrompts.tsx",
  targetFate: "pendingFate.ts",
  affectedPermanentIds: "pendingFate.ts",
  promptKey: "overlay/choice/DecisionOverlay.tsx",
  // Tells an automated seat that an empty selection forfeits the clause; the human UI
  // already offers the same No Selection answer for every min-0 prompt.
  purpose: null,
  assemblyCardId: "screen/layout/DecisionPrompts.tsx",
  digiXrosCardId: "screen/layout/DecisionPrompts.tsx",
};

describe("engine to UI decision contract", () => {
  for (const [key, consumer] of Object.entries(OPTION_CONSUMERS)) {
    if (consumer === null) continue;
    it(`reads options.${key} in ${consumer}`, () => {
      const source = readFileSync(join(GAME_DIR, consumer), "utf8");
      expect(source).toMatch(new RegExp(`\\b${key}\\b`));
    });
  }

  const minimalRequests: Record<Exclude<DecisionKind, "mulligan">, DecisionRequest> = {
    optional: { decisionId: "optional", seat: 0, kind: "optional", promptText: "Use this effect?" },
    chooseTargets: {
      decisionId: "targets",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1.",
      options: { candidateInstanceIds: ["a"], min: 1, max: 1 },
    },
    selectCards: {
      decisionId: "cards",
      seat: 0,
      kind: "selectCards",
      promptText: "Select 1.",
      options: { candidateInstanceIds: ["a"], min: 1, max: 1 },
    },
    orderCards: {
      decisionId: "order",
      seat: 0,
      kind: "orderCards",
      promptText: "Order the cards.",
      options: { candidateInstanceIds: ["a", "b"], orderDestination: "deckTop" },
    },
    orderTriggers: {
      decisionId: "triggers",
      seat: 0,
      kind: "orderTriggers",
      promptText: "Choose the next effect.",
      options: { triggerKeys: ["first", "second"], triggerCardIds: ["BT1-001", "BT1-001"] },
    },
    chooseOption: {
      decisionId: "option",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one.",
      options: { choices: ["First", "Second"] },
    },
  };

  it.each(Object.values(minimalRequests))("renders an answerable $kind prompt", (request) => {
    const candidates: DecisionCandidate[] = (request.options?.candidateInstanceIds ?? []).map((instanceId) => ({
      instanceId,
      cardId: "BT1-001",
    }));
    render(
      <I18nProvider>
        <DecisionOverlay
          request={request}
          candidates={candidates}
          picks={request.kind === "chooseTargets" || request.kind === "selectCards" ? ["a"] : []}
          onTogglePick={vi.fn<(instanceId: string) => void>()}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );
    const enabled = screen.getAllByRole("button").filter((button) => !(button as HTMLButtonElement).disabled);
    expect(enabled.length).toBeGreaterThan(0);
  });

  it("covers every decision kind with an answerable surface", () => {
    const covered = new Set<DecisionKind>([...Object.keys(minimalRequests), "mulligan"] as DecisionKind[]);
    expect([...DECISION_KINDS].filter((kind) => !covered.has(kind))).toEqual([]);
  });
});

describe("summed DP budget (maxTotalDP)", () => {
  const request: DecisionRequest = {
    decisionId: "dp-budget",
    seat: 0,
    kind: "chooseTargets",
    promptText: "Delete Digimon with 6000 total DP or less.",
    options: { candidateInstanceIds: ["small", "large"], min: 1, max: 2, maxTotalDP: 6000 },
  };
  const candidates: DecisionCandidate[] = [
    { instanceId: "small", cardId: "EX3-039", currentDP: 4000 },
    { instanceId: "large", cardId: "EX1-073", currentDP: 5000 },
  ];

  it("shows the budget and blocks a dialog pick that would exceed it", () => {
    const onTogglePick = vi.fn<(instanceId: string) => void>();
    render(
      <I18nProvider>
        <DecisionOverlay
          request={request}
          candidates={candidates}
          picks={["small"]}
          onTogglePick={onTogglePick}
          onRespond={vi.fn<(response: DecisionResponse) => void>()}
        />
      </I18nProvider>,
    );
    expect(screen.getByText("Total DP: 4,000 / 6,000")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /5,000 DP/ }));
    expect(onTogglePick).not.toHaveBeenCalled();
  });

  it("blocks a board pick that would exceed it and keeps deselection possible", () => {
    const allows = (instanceId: string, picks: string[]) =>
      decisionAllowsPick({
        instanceId,
        picks,
        decisionSelectable: new Set(["small", "large"]),
        decisionInstanceColors: new Map(),
        decisionDifferentColors: false,
        decisionVisibleCardIds: new Map(),
        decisionDistinctCardIds: false,
        decisionMaxTotalDP: 6000,
        decisionCandidateDP: new Map([
          ["small", 4000],
          ["large", 5000],
        ]),
      });
    expect(allows("large", ["small"])).toBe(false);
    expect(allows("large", [])).toBe(true);
    expect(allows("small", ["small"])).toBe(true);
  });
});
