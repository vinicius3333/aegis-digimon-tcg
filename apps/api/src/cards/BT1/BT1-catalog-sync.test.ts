import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt1Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 115 }, (_, index) => `BT1-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT1-"))
  .sort();

describe("BT1 persisted IR", () => {
  it("has exactly the expected 115 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT1 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT1-"))
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

  it("has exactly 115 IR-only production modules imported by the set barrel", () => {
    const productionFiles = readdirSync(bt1Directory)
      .filter((fileName) => /^BT1-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    const indexSource = readFileSync(join(bt1Directory, "index.ts"), "utf8");
    const importedCardIds = Array.from(
      indexSource.matchAll(/import\s+["']\.\/(BT1-\d{3})\.js["'];/g),
      ([, cardId]) => cardId,
    ).sort();
    expect(importedCardIds).toEqual(cardIds);

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt1Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });

  it("has one direct focused test per card and no raw actions or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt1Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt1Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt1Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(new RegExp(`["']\\./${cardId}\\.js["']`));
      expect(testSource).toMatch(/\b(?:(?:describe|it)\s*\(|auditEffectlessDigimon\s*\()/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });

  it("keeps exact card names distinct from printed in-name substring references", () => {
    const expectedRefs = [
      ["BT1-011", "Agumon", "name"],
      ["BT1-056", "Tinkermon", "nameExact"],
    ] as const;

    type NameReference = Parameters<typeof matchNameOrTrait>[1];
    function isNameMatch(value: unknown): value is NameReference["match"] {
      return value === "name" || value === "nameExact";
    }
    function nameReferences(value: unknown): NameReference[] {
      if (Array.isArray(value)) return value.flatMap(nameReferences);
      if (value === null || typeof value !== "object") return [];
      const record = value as Record<string, unknown>;
      const current =
        Array.isArray(record.tokens) &&
        record.tokens.every((token) => typeof token === "string") &&
        isNameMatch(record.match)
          ? [{ tokens: record.tokens as string[], match: record.match }]
          : [];
      return [...current, ...Object.values(record).flatMap(nameReferences)];
    }

    const discoveredRefs = cardIds
      .flatMap((cardId) =>
        nameReferences(runtimeCompiledCard(cardId)).flatMap(({ tokens, match }) =>
          tokens.map((token) => [cardId, token, match] as const),
        ),
      )
      .sort();
    expect(discoveredRefs).toEqual([...expectedRefs].sort());

    for (const [cardId, token, match] of expectedRefs) {
      const refs = nameReferences(runtimeCompiledCard(cardId)).filter(({ tokens }) => tokens.includes(token));
      expect(refs).toEqual([{ tokens: [token], match }]);
      expect(matchNameOrTrait({ cardId: "EXACT", nameEn: token }, refs[0]!)).toBe(true);
      expect(matchNameOrTrait({ cardId: "NEAR", nameEn: `${token} X` }, refs[0]!)).toBe(match === "name");
    }
  });
});
