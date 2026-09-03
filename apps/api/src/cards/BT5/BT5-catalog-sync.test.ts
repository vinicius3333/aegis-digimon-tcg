import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { hasRegisteredCompiledCard, matchNameOrTrait, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const bt5Directory = fileURLToPath(new URL(".", import.meta.url));
const effects = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const committedCards = JSON.parse(readFileSync(cardsPath, "utf8")) as { cardId: string }[];
const expectedCardIds = Array.from({ length: 112 }, (_, index) => `BT5-${String(index + 1).padStart(3, "0")}`);
const cardIds = committedCards
  .map(({ cardId }) => cardId)
  .filter((cardId) => cardId.startsWith("BT5-"))
  .sort();

describe("BT5 persisted IR", () => {
  it("has exactly the expected 112 cards in the committed card catalog", () => {
    expect(cardIds).toEqual(expectedCardIds);
  });

  it("has exactly the committed BT5 card IDs in the effects catalog", () => {
    expect(
      Object.keys(effects)
        .filter((cardId) => cardId.startsWith("BT5-"))
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
    const productionFiles = readdirSync(bt5Directory)
      .filter((fileName) => /^BT5-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt5Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`registerIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`));
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });

  it("has one direct focused test per card and no raw actions or TypeScript suppressions", () => {
    const files = new Set(readdirSync(bt5Directory));

    for (const cardId of cardIds) {
      expect(files).toContain(`${cardId}.test.ts`);
      const source = readFileSync(join(bt5Directory, `${cardId}.ts`), "utf8");
      const testSource = readFileSync(join(bt5Directory, `${cardId}.test.ts`), "utf8");
      expect(testSource).toMatch(new RegExp(`["']\\./${cardId}\\.js["']`));
      expect(testSource).toMatch(/\b(?:(?:describe|it)\s*\(|auditEffectlessDigimon\s*\()/);
      expect(`${source}\n${testSource}`).not.toMatch(/\bRawUnparsed\b/);
      expect(`${source}\n${testSource}`).not.toMatch(/@ts-(?:nocheck|ignore|expect-error)\b/);
    }
  });

  it("keeps exact card names distinct from printed in-name substring references", () => {
    const expectedRefs = [
      ["BT5-007", "Greymon", 0, 1],
      ["BT5-007", "DoruGreymon", 1, 0],
      ["BT5-007", "BurningGreymon", 1, 0],
      ["BT5-007", "DexDoruGreymon", 1, 0],
      ["BT5-008", "Gaossmon", 1, 0],
      ["BT5-010", "Agumon", 1, 0],
      ["BT5-019", "OmniShoutmon", 1, 0],
      ["BT5-019", "ZeigGreymon", 1, 0],
      ["BT5-024", "Gabumon", 1, 0],
      ["BT5-031", "Garurumon", 0, 1],
      ["BT5-031", "KendoGarurumon", 1, 0],
      ["BT5-047", "Palmon", 1, 0],
      ["BT5-059", "Arata Sanada", 1, 0],
      ["BT5-060", "Monitamon", 1, 0],
      ["BT5-063", "Arata Sanada", 2, 0],
      ["BT5-072", "Fake Agumon Expert", 1, 0],
      ["BT5-074", "Troopmon", 1, 0],
      ["BT5-083", "Gallantmon", 0, 1],
      ["BT5-085", "Diaboromon", 1, 0],
      ["BT5-090", "Diaboromon", 1, 0],
      ["BT5-092", "Agumon", 1, 0],
      ["BT5-092", "Gabumon", 1, 0],
      ["BT5-092", "Garurumon", 0, 1],
      ["BT5-092", "Omnimon", 0, 1],
      ["BT5-092", "Greymon", 0, 1],
      ["BT5-104", "Diaboromon", 1, 0],
      ["BT5-110", "Omnimon", 0, 1],
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

  it("keeps alternate evolution bases and family exclusions exact", () => {
    expect(runtimeCompiledCard("BT5-014")?.digivolutionRequirement).toEqual([
      { namesExact: ["Shoutmon"], cost: 4, isAlternate: true },
    ]);
    expect(runtimeCompiledCard("BT5-067")?.digivolutionRequirement).toEqual([
      { namesExact: ["Keramon"], cost: 4, isAlternate: true },
    ]);
    expect(runtimeCompiledCard("BT5-111")?.digivolutionRequirement).toEqual([
      { names: ["Omnimon"], cost: 3, isAlternate: true, battleAreaOnly: true },
    ]);

    const exactFamilyExclusion = {
      kind: "not",
      condition: {
        kind: "selfHasName",
        names: ["DoruGreymon", "BurningGreymon", "DexDoruGreymon"],
      },
    };
    expect(runtimeCompiledCard("BT5-001")?.effects[0]?.actions[0]).toMatchObject({
      condition: { kind: "allOf", conditions: expect.arrayContaining([exactFamilyExclusion]) },
    });
    expect(runtimeCompiledCard("BT5-010")?.effects[1]?.actions[0]).toMatchObject({
      while: { kind: "allOf", conditions: expect.arrayContaining([exactFamilyExclusion]) },
    });
    expect(runtimeCompiledCard("BT5-015")?.effects[1]?.actions[0]).toMatchObject({
      while: { kind: "allOf", conditions: expect.arrayContaining([exactFamilyExclusion]) },
    });
  });
});
