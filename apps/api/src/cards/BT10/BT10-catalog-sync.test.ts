import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt10Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 112 }, (_, index) => `BT10-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT10-"))
  .sort();

describe("BT10 persisted IR", () => {
  it("has exactly the expected 112 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT10 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT10-"))
        .sort(),
    ).toEqual(cardIds);
  });

  it.each(cardIds)("keeps %s synchronized with its authoritative module", (cardId) => {
    expect(hasRegisteredCompiledCard(cardId)).toBe(true);
    const compiled = runtimeCompiledCard(cardId);
    expect(compiled).toBeDefined();
    expect(effects[cardId]).toEqual(compiled);
    expect(effects[cardId]?.coverage).toBe("full");
    expect(effects[cardId]?.residual).toEqual([]);
  });

  it("has exactly 112 IR-only production modules", () => {
    const productionFiles = readdirSync(bt10Directory)
      .filter((fileName) => /^BT10-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt10Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(
        new RegExp(
          `registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*(?:compiled|getCompiledCard\\(\\s*["']${cardId}["']\\s*\\)!)\\s*\\)`,
        ),
      );
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
      expect(source).not.toMatch(/_earlyMidHandwritten/);
      expect(source).not.toMatch(/\.\s*effectsForTiming\s*=/);
    }
  });

  it("has one focused test per card and no RawUnparsed or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt10Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt10Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt10Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(/\b(?:describe|it)\s*\(/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });
});
