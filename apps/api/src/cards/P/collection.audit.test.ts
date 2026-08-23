import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const pCards = allCards()
  .filter((card) => /^P-\d{3}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(2)) - Number(b.cardId.slice(2)));

describe("P collection audit ledger guards", () => {
  it("covers every committed P catalog entry from P-001 through P-244", () => {
    expect(pCards).toHaveLength(243);
    expect(pCards[0]?.cardId).toBe("P-001");
    expect(pCards.at(-1)?.cardId).toBe("P-244");
    expect(pCards.some((card) => card.cardId === "P-226")).toBe(false);
  });

  it("has a registered direct module and compiled IR record for every catalog card", () => {
    const missingModules = pCards
      .filter((card) => getEffectModule(card.cardId) === undefined)
      .map((card) => card.cardId);
    const missingIr = pCards
      .filter((card) => getCompiledCard(card.cardId) === undefined || runtimeCompiledCard(card.cardId) === undefined)
      .map((card) => card.cardId);
    expect(missingModules).toEqual([]);
    expect(missingIr).toEqual([]);
  });

  it("has full executable IR coverage with no residual behavior", () => {
    const observed = pCards
      .filter((card) => {
        const compiled = runtimeCompiledCard(card.cardId);
        return compiled?.coverage !== "full" || (compiled.residual?.length ?? 0) > 0;
      })
      .map((card) => card.cardId);
    expect(observed).toEqual([]);
  });
});
