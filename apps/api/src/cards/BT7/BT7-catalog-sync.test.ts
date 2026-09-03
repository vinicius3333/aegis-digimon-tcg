import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { hasRegisteredCompiledCard, matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt7Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 112 }, (_, index) => `BT7-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT7-"))
  .sort();

describe("BT7 persisted IR", () => {
  it("has exactly the expected 112 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT7 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT7-"))
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
    const productionFiles = readdirSync(bt7Directory)
      .filter((fileName) => /^BT7-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt7Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });

  it("has one focused test per card and no RawUnparsed or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt7Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt7Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt7Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(/\b(?:(?:describe|it)\s*\(|auditEffectlessDigimon\s*\()/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });

  it("keeps bracket-only BT7 card-name references exact", () => {
    const expectedRefs = [
      ["BT7-011", "Takuya Kanbara", 1],
      ["BT7-019", "Susanoomon", 1],
      ["BT7-019", "Koji Minamoto", 2],
      ["BT7-022", "Koji Minamoto", 1],
      ["BT7-023", "Tommy Himi", 1],
      ["BT7-046", "J.P. Shibayama", 1],
      ["BT7-047", "J.P. Shibayama", 1],
      ["BT7-056", "Kota Domoto", 1],
      ["BT7-057", "DeadlyAxemon", 1],
      ["BT7-058", "DarkKnightmon", 1],
      ["BT7-058", "DeadlyAxemon", 1],
      ["BT7-073", "Koichi Kimura", 1],
    ] as const;

    type NameReference = Parameters<typeof matchNameOrTrait>[1];
    function isNameMatch(value: unknown): value is NameReference["match"] {
      return (
        value === "name" ||
        value === "nameExact" ||
        value === "trait" ||
        value === "traitContains" ||
        value === "text" ||
        value === "any"
      );
    }
    function nameReferences(value: unknown): NameReference[] {
      if (Array.isArray(value)) return value.flatMap(nameReferences);
      if (value === null || typeof value !== "object") return [];
      const record = value as Record<string, unknown>;
      const current =
        Array.isArray(record.tokens) &&
        record.tokens.every((token) => typeof token === "string") &&
        isNameMatch(record.match)
          ? [
              {
                tokens: record.tokens.filter((token): token is string => typeof token === "string"),
                match: record.match,
              },
            ]
          : [];
      return [...current, ...Object.values(record).flatMap(nameReferences)];
    }

    for (const [cardId, token, expectedCount] of expectedRefs) {
      const refs = nameReferences(runtimeCompiledCard(cardId)).filter(({ tokens }) => tokens.includes(token));
      expect(refs, `${cardId} ${token}`).toHaveLength(expectedCount);
      expect(
        refs.every(({ match }) => match === "nameExact"),
        `${cardId} ${token}`,
      ).toBe(true);
      for (const ref of refs) {
        expect(matchNameOrTrait({ cardId: "NEAR", nameEn: `${token} X` }, ref)).toBe(false);
      }
    }

    for (const cardId of ["BT7-014", "BT7-025", "BT7-051", "BT7-075"]) {
      expect(JSON.stringify(runtimeCompiledCard(cardId))).toContain(`"cardId":"${cardId}"`);
    }
  });
});
