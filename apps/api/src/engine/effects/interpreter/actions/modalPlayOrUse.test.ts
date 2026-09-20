import type { Action } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../compiledCards.js";
import { mergedPlayOrUseAction } from "./modal.js";
import "../../../../cards/index.js";

const MIGRATED = [
  "EX12-013",
  "EX12-027",
  "EX12-041",
  "EX12-043",
  "EX12-050",
  "EX13-005",
  "EX13-012",
  "EX13-043",
  "EX13-058",
  "EX13-064",
  "BT25-041",
  "BT25-073",
  "BT26-006",
  "BT26-012",
  "BT26-032",
  "BT26-033",
  "BT26-049",
  "ST23-04",
  "ST23-08",
  "ST24-06",
] as const;

const GENUINE_MODAL = ["EX12-066", "EX12-067", "EX12-068", "BT26-026"] as const;

function modalActions(value: unknown): Extract<Action, { kind: "Modal" }>[] {
  if (value === null || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  return [
    ...(object.kind === "Modal" ? [object as unknown as Extract<Action, { kind: "Modal" }>] : []),
    ...Object.values(object).flatMap(modalActions),
  ];
}

describe("automatic play-or-use modal migration", () => {
  it.each(MIGRATED)("normalizes %s to one mixed card selection", (cardId) => {
    const card = runtimeCompiledCard(cardId);
    expect(card).toBeDefined();
    expect(modalActions(card).some((modal) => mergedPlayOrUseAction(modal) !== undefined)).toBe(true);
  });

  it.each(GENUINE_MODAL)("preserves %s as a genuine effect choice", (cardId) => {
    const card = runtimeCompiledCard(cardId);
    expect(card).toBeDefined();
    expect(modalActions(card).some((modal) => mergedPlayOrUseAction(modal) !== undefined)).toBe(false);
  });
});
