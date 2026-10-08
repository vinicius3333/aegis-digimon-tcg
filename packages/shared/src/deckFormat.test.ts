import { describe, expect, it } from "vitest";
import {
  deckFormat,
  formatCardViolation,
  formatCopyLimit,
  formatPairViolations,
  historicalDeckFormats,
  isDeckFormat,
} from "./deckFormat.js";
import { deckLegality } from "./decks/legality.js";

describe("deck formats", () => {
  it("offers released products including BT13, excluding unknown and unverified products", () => {
    expect(historicalDeckFormats("2023-07-21")).toContain("BT13");
    expect(historicalDeckFormats("2023-07-21")).not.toContain("BT14");
    expect(isDeckFormat("BT999")).toBe(false);
    expect(isDeckFormat("LM")).toBe(false);
    expect(deckFormat(undefined)).toBe("standard");
    expect(deckFormat(undefined, true)).toBe("unlimited");
  });
  it("includes earlier boosters, starters and dated promos, and excludes later or undated cards", () => {
    for (const id of ["BT1-010", "BT13-012", "EX4-019", "ST14-02", "P-079"])
      expect(formatCardViolation(id, "BT13")).toBeUndefined();
    for (const id of ["BT14-033", "ST15-01", "P-123", "LM-051"]) expect(formatCardViolation(id, "BT13")).toBeDefined();
  });
  it("uses the historical restrictions, including restrictions later lifted", () => {
    expect(formatCopyLimit("BT13-012", "BT13")).toBe(4);
    expect(formatCopyLimit("BT13-012", "standard")).toBe(1);
    expect(formatCopyLimit("BT6-015", "BT13")).toBe(1);
    expect(formatCopyLimit("BT6-015", "BT6")).toBe(4);
    expect(formatCopyLimit("BT7-072", "BT7")).toBe(4);
    expect(formatCopyLimit("BT7-072", "BT8")).toBe(1);
    expect(formatCopyLimit("BT6-015", "BT14")).toBe(4);
    expect(formatCopyLimit("BT5-109", "BT13")).toBe(0);
    expect(formatCopyLimit("BT5-109", "unlimited")).toBe(4);
    expect(formatPairViolations(["EX2-007", "EX7-064"], "BT13")).toEqual([]);
    expect(formatPairViolations(["EX2-007", "EX7-064"], "standard")).toHaveLength(1);
    expect(formatPairViolations(["EX5-065", "BT13-102"], "EX5")).toHaveLength(1);
    expect(formatPairViolations(["EX5-065", "BT13-102"], "BT13")).toHaveLength(0);
    expect(formatPairViolations(["EX5-065", "BT13-102"], "standard")).toHaveLength(0);
  });
  it("Pauper uses base C/U rarity for main cards and eggs and retains printed limits", () => {
    expect(formatCardViolation("BT1-009", "pauper")).toBeUndefined();
    expect(formatCardViolation("BT1-002", "pauper")).toBeUndefined();
    expect(formatCardViolation("BT1-025", "pauper")).toContain("C/U");
    expect(formatCopyLimit("BT6-085", "pauper")).toBe(50);
    expect(formatCopyLimit("BT1-010", "unlimited")).toBe(4);
    const deck = { mainDeck: Array<string>(50).fill("BT6-085"), eggDeck: ["BT1-002"] };
    expect(deckLegality(deck, { format: "pauper" }).legal).toBe(true);
    expect(deckLegality({ ...deck, eggDeck: ["BT1-025"] }, { format: "pauper" }).legal).toBe(false);
  });
});
