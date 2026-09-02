import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt3Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 112 }, (_, index) => `BT3-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT3-"))
  .sort();

describe("BT3 persisted IR", () => {
  it("has exactly the expected 112 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT3 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT3-"))
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
    const productionFiles = readdirSync(bt3Directory)
      .filter((fileName) => /^BT3-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt3Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });

  it("has one direct focused test per card and no raw actions or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt3Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt3Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt3Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(new RegExp(`["']\\./${cardId}\\.js["']`));
      expect(testSource).toMatch(/\b(?:(?:describe|it)\s*\(|auditEffectlessDigimon\s*\()/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });

  it("keeps exact card names distinct from printed in-name substring references", () => {
    const expectedRefs = [
      ["BT3-008", "RagnaLoardmon", 1, 0],
      ["BT3-019", "Durandamon", 1, 0],
      ["BT3-019", "BryweLudramon", 1, 0],
      ["BT3-031", "Paildramon", 1, 0],
      ["BT3-031", "Dinobeemon", 1, 0],
      ["BT3-062", "RagnaLoardmon", 1, 0],
      ["BT3-063", "Chuumon", 1, 0],
      ["BT3-070", "Etemon", 0, 1],
      ["BT3-086", "MaloMyotismon", 1, 0],
      ["BT3-087", "MaloMyotismon", 1, 0],
      ["BT3-111", "Paildramon", 1, 0],
      ["BT3-111", "Dinobeemon", 1, 0],
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
});
