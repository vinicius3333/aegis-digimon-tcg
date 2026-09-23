import type { Action, CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../engine/effects/interpreter/compiledCards.js";
import { describeAction } from "../engine/effects/interpreter/describe.js";
import { mergedPlayOrUseAction } from "../engine/effects/interpreter/actions/modal.js";
import "./index.js";

type ModalAction = Extract<Action, { kind: "Modal" }>;

type Rule = "costed-options-need-labels" | "nested-optional-cost" | "nested-abort-on-decline" | "near-identical-labels";

interface Violation {
  cardId: string;
  effectIndex: number;
  path: string;
  rule: Rule;
  detail: string;
}

// Near-identical generated labels: both labels are long enough that a player reads them as
// prose, and the shared prefix plus shared suffix covers most of the shorter one, so the
// distinguishing words are buried in the middle. Identical labels are flagged at any length.
const NEAR_IDENTICAL_MIN_LENGTH = 60;
const NEAR_IDENTICAL_SHARED_RATIO = 0.7;

/**
 * Current violations, keyed by `<cardId>|<rule>`. Each entry is pending a card fix. The test
 * fails on any violation not listed here and on any entry that no longer violates, so remove
 * the entry in the same change that fixes the card.
 */
const KNOWN_VIOLATIONS: Record<string, string> = {};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Mirrors `actionPaidCost` in describe.ts: a numeric digivolve `cost` is not a paid Cost. */
const hasPaidCost = (action: Action): boolean =>
  action.kind === "CostGatedBlock" || (isRecord(action.cost) && typeof action.cost.kind === "string");

const optionIsCosted = (option: readonly Action[]): boolean => option.some(hasPaidCost);

/** The labels `runModal` sends in `chooseOption` when the modal has no authored `labels`. */
const generatedLabels = (modal: ModalAction): string[] =>
  modal.options.map((option, idx) =>
    option.length > 0
      ? option.map(describeAction).join(" · ")
      : describeAction({ kind: "RawUnparsed", text: `option ${idx}` }),
  );

const sharedAffixLength = (left: string, right: string): number => {
  const shorter = Math.min(left.length, right.length);
  let prefix = 0;
  while (prefix < shorter && left[prefix] === right[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < shorter - prefix && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]) suffix += 1;
  return prefix + suffix;
};

const areNearIdentical = (left: string, right: string): boolean => {
  if (left === right) return true;
  const shorter = Math.min(left.length, right.length);
  if (shorter <= NEAR_IDENTICAL_MIN_LENGTH) return false;
  return sharedAffixLength(left, right) >= NEAR_IDENTICAL_SHARED_RATIO * shorter;
};

function checkModal(modal: ModalAction, report: (rule: Rule, detail: string) => void): void {
  // `runModal` collapses a Play/Use pair into one dual-mode play and never shows a choice.
  if (mergedPlayOrUseAction(modal) !== undefined) return;

  const costedOptions = modal.options.filter(optionIsCosted).length;
  if (costedOptions >= 2 && modal.labels?.length !== modal.options.length) {
    report(
      "costed-options-need-labels",
      `${costedOptions} costed options, labels ${JSON.stringify(modal.labels ?? null)}; generated ${JSON.stringify(generatedLabels(modal))}`,
    );
  }

  modal.options.forEach((option, optionIndex) => {
    for (const action of option) {
      if (!hasPaidCost(action)) continue;
      if (action.optional === true) {
        report(
          "nested-optional-cost",
          `option ${optionIndex} ${action.kind} is optional (modal optional=${modal.optional === true})`,
        );
      }
      if ("abortOnDecline" in action && action.abortOnDecline === true && modal.optional !== true) {
        report(
          "nested-abort-on-decline",
          `option ${optionIndex} ${action.kind} has abortOnDecline in a non-optional modal`,
        );
      }
    }
  });

  const choosesOneAtATime = modal.choose === 1 || modal.chooseScaling !== undefined;
  if (!choosesOneAtATime || modal.labels !== undefined) return;
  const labels = generatedLabels(modal);
  for (let left = 0; left < labels.length; left += 1) {
    for (let right = left + 1; right < labels.length; right += 1) {
      if (areNearIdentical(labels[left]!, labels[right]!)) {
        report(
          "near-identical-labels",
          `options ${left}/${right}: ${JSON.stringify(labels[left])} vs ${JSON.stringify(labels[right])}`,
        );
      }
    }
  }
}

/** Visits every object with a string `kind` nested anywhere below `node`, without enumerating kinds. */
function walk(node: unknown, path: string, visit: (value: Record<string, unknown>, path: string) => void): void {
  if (Array.isArray(node)) {
    node.forEach((child, idx) => walk(child, `${path}[${idx}]`, visit));
    return;
  }
  if (!isRecord(node)) return;
  if (typeof node.kind === "string") visit(node, path);
  for (const [key, child] of Object.entries(node)) {
    if (isRecord(child) || Array.isArray(child)) walk(child, `${path}.${key}`, visit);
  }
}

interface Scan {
  violations: Violation[];
  modalCount: number;
}

function scanCard(cardId: string, compiled: CompiledCard, scan: Scan): void {
  compiled.effects.forEach((effect, effectIndex) => {
    walk(effect, `effects[${effectIndex}]`, (node, path) => {
      if (node.kind !== "Modal" || !Array.isArray(node.options)) return;
      scan.modalCount += 1;
      checkModal(node as unknown as ModalAction, (rule, detail) =>
        scan.violations.push({ cardId, effectIndex, path, rule, detail }),
      );
    });
  });
}

const violationKey = (violation: Pick<Violation, "cardId" | "rule">): string => `${violation.cardId}|${violation.rule}`;

const formatViolation = (violation: Violation): string =>
  `${violation.cardId} effect ${violation.effectIndex} [${violation.rule}] at ${violation.path}: ${violation.detail}`;

describe("modal choice labels", () => {
  const scan: Scan = { violations: [], modalCount: 0 };
  for (const [cardId, compiled] of [...registeredCompiledCards.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    scanCard(cardId, compiled, scan);
  }

  it("scans the registered card collection", () => {
    expect(registeredCompiledCards.size).toBeGreaterThan(1000);
    expect(scan.modalCount).toBeGreaterThan(0);
  });

  it("flags the unlabeled optional cost-gated bullets EX13-032 used to have", () => {
    const unsuspendByPaying = (raw: string): Action => ({
      kind: "CostGatedBlock",
      optional: true,
      cost: { kind: "trashSecurityTop", controller: "mine", raw },
      actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
    });
    const rules: Rule[] = [];
    checkModal(
      {
        kind: "Modal",
        choose: 1,
        options: [
          [unsuspendByPaying("By trashing your top security card")],
          [unsuspendByPaying("By trashing your top security card again")],
        ],
      },
      (rule) => rules.push(rule),
    );
    expect(new Set(rules)).toEqual(
      new Set<Rule>(["costed-options-need-labels", "nested-optional-cost", "near-identical-labels"]),
    );
  });

  it("has no modal choice violations beyond the known allowlist", () => {
    const unexpected = scan.violations.filter((violation) => !(violationKey(violation) in KNOWN_VIOLATIONS));
    expect(unexpected.length, `new modal choice violations:\n${unexpected.map(formatViolation).join("\n")}`).toBe(0);
  });

  it("keeps the allowlist free of entries that no longer violate", () => {
    const current = new Set(scan.violations.map(violationKey));
    const stale = Object.keys(KNOWN_VIOLATIONS).filter((key) => !current.has(key));
    expect(stale.length, `fixed cards still listed in KNOWN_VIOLATIONS:\n${stale.join("\n")}`).toBe(0);
  });
});
