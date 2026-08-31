import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st21Ids = allCards()
  .filter((card) => /^ST21-\d{2}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(5)) - Number(b.cardId.slice(5)))
  .map((card) => card.cardId);
const expectedIds = Array.from({ length: 15 }, (_, index) => `ST21-${String(index + 1).padStart(2, "0")}`);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("ST21 collection audit gate", () => {
  it("has the exact committed catalog inventory in ascending order", () => {
    expect(st21Ids).toEqual(expectedIds);
  });

  it("keeps every catalog card imported with a focused behavioral test", () => {
    for (const cardId of st21Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");
      expect(
        indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")),
        `${cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${cardId} test suite`).toMatch(/\bdescribe\s*\(/);
      expect(testSource, `${cardId} observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${cardId} skipped proof`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);
    }
  });

  it.each(expectedIds)("%s is registered exclusively as complete executable IR", (cardId) => {
    const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
    const compiled = runtimeCompiledCard(cardId);

    expect(
      moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g")),
    ).toHaveLength(1);
    expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} exactly one IR registration`).toHaveLength(1);
    expect(moduleSource, `${cardId} legacy registration`).not.toMatch(/\bregisterCard\s*\(/);
    expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
    expect(getCompiledCard(cardId), `${cardId} committed IR`).toBeDefined();
    expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
    expect(compiled?.residual, `${cardId} residual`).toEqual([]);
    expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    expect(compiled?.effects.length, `${cardId} executable behavior`).toBeGreaterThan(0);
  });
});
