import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const st15Cards = allCards()
  .filter((card) => /^ST15-\d{2}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(5)) - Number(b.cardId.slice(5)));
const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));

describe("ST15 collection audit ledger guards", () => {
  it("covers every committed ST15 catalog entry in ascending order", () => {
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
      const moduleSource = readFileSync(`${collectionDirectory}${card.cardId}.ts`, "utf8");
      const testSource = readFileSync(`${collectionDirectory}${card.cardId}.test.ts`, "utf8");
      expect(moduleSource).toContain(`registerIrCard("${card.cardId}", compiled)`);
      expect(moduleSource).not.toMatch(/\bregisterCard\s*\(/);
      expect(testSource).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource).toMatch(/\bexpect\s*\(/);
      expect(runtimeCompiledCard(card.cardId)).toBeDefined();
      expect(runtimeCompiledCard(card.cardId)?.coverage).toBe("full");
      expect(runtimeCompiledCard(card.cardId)?.residual).toEqual([]);
      expect(getCompiledCard(card.cardId)?.coverage).toBe("full");
      expect(getCompiledCard(card.cardId)?.residual).toEqual([]);
    }
  });
});
