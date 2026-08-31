import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./index.js";

const CARDS = allCards().filter((card) => /^AD1-\d{3}$/.test(card.cardId)).sort((a, b) => a.cardId.localeCompare(b.cardId));

describe("AD1 collection audit gate", () => {
  it("registers every catalog card with complete compiled IR", () => {
    expect(CARDS).toHaveLength(25);
    expect(CARDS.every((card) => getEffectModule(card.cardId) !== undefined)).toBe(true);
    expect(CARDS.every((card) => runtimeCompiledCard(card.cardId)?.coverage === "full")).toBe(true);
    expect(CARDS.every((card) => runtimeCompiledCard(card.cardId)?.residual.length === 0)).toBe(true);
  });

  it("uses only registerIrCard in every AD1 module", () => {
    for (const card of CARDS) {
      const source = readFileSync(resolve(import.meta.dirname, `${card.cardId}.ts`), "utf8");
      expect(source).not.toMatch(/registerCard\s*\(/);
      expect(source).toMatch(/registerIrCard\s*\(/);
    }
  });
});
