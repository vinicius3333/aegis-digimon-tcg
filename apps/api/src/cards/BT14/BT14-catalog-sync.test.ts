import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt14Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 102 }, (_, index) => `BT14-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT14-"))
  .sort();

describe("BT14 persisted IR", () => {
  it("has exactly the expected 102 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT14 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT14-"))
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

  it("has exactly 102 IR-only production modules", () => {
    const productionFiles = readdirSync(bt14Directory)
      .filter((fileName) => /^BT14-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt14Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });
});
