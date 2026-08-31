import { allCards } from "@aegis/shared";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../engine/effects/interpreter.js";

type CollectionCase = { set: string; cards: readonly { cardId: string; nameEn: string }[] };

function hasRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(hasRawUnparsed);
}

export function describeLegacyStCollection({ set, cards }: CollectionCase): void {
  const catalogCards = allCards()
    .filter((card) => card.set === set)
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
  const indexSource = readFileSync(new URL(`./${set}/index.ts`, import.meta.url), "utf8");

  describe(`${set} collection audit gate`, () => {
    it("matches the complete catalog inventory and exact English names", () => {
      expect(catalogCards.map(({ cardId, nameEn }) => ({ cardId, nameEn }))).toEqual(cards);
    });

    it("proves every catalog card has a colocated runnable behavioral test and index import", () => {
      for (const { cardId } of catalogCards) {
        const testSource = readFileSync(new URL(`./${set}/${cardId}.test.ts`, import.meta.url), "utf8");
        expect(indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")), `${cardId} index`).toHaveLength(
          1,
        );
        expect(testSource, `${cardId} describe`).toMatch(/\bdescribe\s*\(/);
        expect(testSource, `${cardId} test`).toMatch(/\bit\s*\(/);
        expect(testSource, `${cardId} assertion`).toMatch(/\bexpect\s*\(/);
        expect(testSource, `${cardId} skipped`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);
      }
    });

    it("proves every catalog card is exclusively registered with complete residual-free IR", () => {
      for (const { cardId } of catalogCards) {
        const moduleSource = readFileSync(new URL(`./${set}/${cardId}.ts`, import.meta.url), "utf8");
        const compiled = runtimeCompiledCard(cardId);
        expect(
          moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`)),
          `${cardId} direct IR`,
        ).toHaveLength(1);
        expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} IR count`).toHaveLength(1);
        expect(moduleSource, `${cardId} legacy register`).not.toMatch(/\bregisterCard\s*\(/);
        expect(hasRegisteredCompiledCard(cardId), `${cardId} registration`).toBe(true);
        expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
        expect(compiled?.residual, `${cardId} residual`).toEqual([]);
        expect(hasRawUnparsed(compiled), `${cardId} raw IR`).toBe(false);
      }
    });
  });
}
