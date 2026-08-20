import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const pCards = allCards()
  .filter((card) => /^P-\d{3}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(2)) - Number(b.cardId.slice(2)));

const residualCards = [
  "P-012",
  "P-016",
  "P-021",
  "P-043",
  "P-048",
  "P-070",
  "P-072",
  "P-075",
  "P-077",
  "P-085",
  "P-086",
  "P-123",
  "P-130",
  "P-156",
  "P-158",
  "P-199",
  "P-215",
  "P-217",
  "P-218",
  "P-220",
  "P-233",
  "P-234",
  "P-242",
  "P-244",
];

describe("P collection audit ledger guards", () => {
  it("covers every committed P catalog entry from P-001 through P-244", () => {
    expect(pCards).toHaveLength(243);
    expect(pCards[0]?.cardId).toBe("P-001");
    expect(pCards.at(-1)?.cardId).toBe("P-244");
    expect(pCards.some((card) => card.cardId === "P-226")).toBe(false);
  });

  it("has a registered direct module and compiled IR record for every catalog card", () => {
    const missingModules = pCards.filter((card) => getEffectModule(card.cardId) === undefined).map((card) => card.cardId);
    const missingIr = pCards
      .filter((card) => getCompiledCard(card.cardId) === undefined || runtimeCompiledCard(card.cardId) === undefined)
      .map((card) => card.cardId);
    expect(missingModules).toEqual([]);
    expect(missingIr).toEqual([]);
  });

  it("keeps the committed residual list explicit instead of treating it as verified behavior", () => {
    const observed = pCards
      .filter((card) => (getCompiledCard(card.cardId)?.residual?.length ?? 0) > 0)
      .map((card) => card.cardId);
    expect(observed).toEqual(residualCards);
  });
});
