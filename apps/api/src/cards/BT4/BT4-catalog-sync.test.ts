import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { hasRegisteredCompiledCard, matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt4Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 115 }, (_, index) => `BT4-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT4-"))
  .sort();

describe("BT4 persisted IR", () => {
  it("has exactly the expected 115 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT4 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT4-"))
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

  it("has exactly 115 IR-only production modules", () => {
    const productionFiles = readdirSync(bt4Directory)
      .filter((fileName) => /^BT4-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt4Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });

  it("has one direct focused test per card and no raw actions or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt4Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt4Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt4Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(new RegExp(`["']\\./${cardId}\\.js["']`));
      expect(testSource).toMatch(/\b(?:(?:describe|it)\s*\(|auditEffectlessDigimon\s*\()/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });

  it("keeps exact card names distinct from printed in-name substring references", () => {
    const expectedRefs = [
      ["BT4-063", "Commandramon", 1, 0],
      ["BT4-071", "Commandramon", 1, 0],
      ["BT4-086", "Cerberusmon", 1, 0],
      ["BT4-092", "Greymon", 0, 1],
      ["BT4-092", "DoruGreymon", 1, 0],
      ["BT4-092", "BurningGreymon", 1, 0],
      ["BT4-092", "DexDoruGreymon", 1, 0],
      ["BT4-093", "Gao", 0, 1],
      ["BT4-099", "Greymon", 0, 1],
      ["BT4-099", "Dramon", 0, 1],
      ["BT4-099", "DoruGreymon", 1, 0],
      ["BT4-099", "BurningGreymon", 1, 0],
      ["BT4-099", "DexDoruGreymon", 1, 0],
      ["BT4-113", "Greymon", 0, 1],
      ["BT4-113", "DoruGreymon", 1, 0],
      ["BT4-113", "BurningGreymon", 1, 0],
      ["BT4-113", "DexDoruGreymon", 1, 0],
      ["BT4-114", "Garurumon", 0, 1],
      ["BT4-114", "KendoGarurumon", 1, 0],
      ["BT4-115", "Lucemon", 0, 1],
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
    const listedRefs = expectedRefs
      .flatMap(([cardId, token, exactCount, substringCount]) => [
        ...Array.from({ length: exactCount }, () => [cardId, token, "nameExact"] as const),
        ...Array.from({ length: substringCount }, () => [cardId, token, "name"] as const),
      ])
      .sort();
    expect(discoveredRefs).toEqual(listedRefs);

    for (const [cardId, token, exactCount, substringCount] of expectedRefs) {
      const refs = nameReferences(runtimeCompiledCard(cardId)).filter(({ tokens }) => tokens.includes(token));
      expect(
        refs.filter(({ match }) => match === "nameExact"),
        `${cardId} exact ${token}`,
      ).toHaveLength(exactCount);
      expect(
        refs.filter(({ match }) => match === "name"),
        `${cardId} substring ${token}`,
      ).toHaveLength(substringCount);
      for (const ref of refs) {
        expect(matchNameOrTrait({ cardId: "EXACT", nameEn: token }, ref)).toBe(true);
        expect(matchNameOrTrait({ cardId: "NEAR", nameEn: `${token} X` }, ref)).toBe(ref.match === "name");
      }
    }
  });

  it("derives the printed costs and colors for every Tamer-onto evolution path", () => {
    const expectedPaths = [
      ["BT4-011", "BT1-085", "BT1-086", { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] }],
      ["BT4-013", "BT1-085", "BT1-086", { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] }],
      ["BT4-025", "BT1-086", "BT1-085", { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] }],
      ["BT4-027", "BT1-086", "BT1-085", { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] }],
    ] as const;

    for (const [cardId, validTamer, invalidTamer, expected] of expectedPaths) {
      expect(matchingAlternateDigivolutionRequirement(cardId, validTamer), `${cardId} valid Tamer`).toEqual(expected);
      expect(matchingAlternateDigivolutionRequirement(cardId, invalidTamer), `${cardId} invalid Tamer`).toBeUndefined();
    }
  });
});
