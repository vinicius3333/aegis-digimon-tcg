import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const st16Cards = allCards()
  .filter((card) => /^ST16-\d{2}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(5)) - Number(b.cardId.slice(5)));

describe("ST16 collection audit ledger", () => {
  it("covers every committed ST16 catalog card in ascending order", () => {
    expect(st16Cards.map((card) => card.cardId)).toEqual(
      Array.from({ length: 16 }, (_, index) => `ST16-${String(index + 1).padStart(2, "0")}`),
    );
  });

  it("keeps every direct module, test, and runtime record complete", () => {
    for (const card of st16Cards) {
      const moduleSource = readFileSync(`${collectionDirectory}${card.cardId}.ts`, "utf8");
      const testSource = readFileSync(`${collectionDirectory}${card.cardId}.test.ts`, "utf8");
      const compiled = getCompiledCard(card.cardId);
      expect(getEffectModule(card.cardId)).toBeDefined();
      expect(runtimeCompiledCard(card.cardId)).toBeDefined();
      expect(moduleSource).toContain(`registerIrCard("${card.cardId}", compiled)`);
      expect(moduleSource).not.toMatch(/\bregisterCard\s*\(/);
      expect(moduleSource).toMatch(/\bcoverage:\s*["']full/);
      expect(moduleSource).toMatch(/\bresidual:\s*\[\]/);
      expect(testSource).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource).toMatch(/\bexpect\s*\(/);
      expect(compiled?.coverage).toBe("full");
      expect(compiled?.residual).toEqual([]);
    }
  });
});
