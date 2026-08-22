import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const st15Cards = allCards()
  .filter((card) => /^ST15-\d{2}$/.test(card.cardId))
  .sort((a, b) => Number(b.cardId.slice(4)) - Number(a.cardId.slice(4)));

describe("ST15 collection audit ledger guards", () => {
  it("covers every committed ST15 catalog entry from ST15-16 through ST15-01", () => {
    expect(st15Cards).toHaveLength(16);
    expect(st15Cards[0]?.cardId).toBe("ST15-01");
    expect(st15Cards.at(-1)?.cardId).toBe("ST15-16");
  });

  it("has a direct module for every card and committed compiled evidence for every card", () => {
    const missingModules = st15Cards
      .filter((card) => getEffectModule(card.cardId) === undefined)
      .map((card) => card.cardId);
    const missingIr = st15Cards.filter((card) => getCompiledCard(card.cardId) === undefined).map((card) => card.cardId);
    expect(missingModules).toEqual([]);
    expect(missingIr).toEqual([]);
  });

  it("executes every card exclusively through complete compiled IR", () => {
    for (const card of st15Cards) {
      expect(runtimeCompiledCard(card.cardId), card.cardId).toBeDefined();
      expect(runtimeCompiledCard(card.cardId)?.coverage, card.cardId).toBe("full");
      expect(runtimeCompiledCard(card.cardId)?.residual, card.cardId).toEqual([]);
    }
  });
});
