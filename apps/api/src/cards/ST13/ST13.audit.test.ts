import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st13Ids = allCards()
  .filter((card) => card.set === "ST13")
  .map((card) => card.cardId)
  .sort();

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("ST13 collection audit proof", () => {
  it("matches the complete committed ST13 catalog inventory", () => {
    expect(st13Ids).toEqual(Array.from({ length: 16 }, (_, index) => `ST13-${String(index + 1).padStart(2, "0")}`));
  });

  it("keeps every catalog card imported, tested, and registered", () => {
    for (const cardId of st13Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");

      expect(indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")), `${cardId} index import`).toHaveLength(1);
      expect(testSource, `${cardId} test suite`).toMatch(/\bdescribe\s*\(/);
      expect(testSource, `${cardId} runnable test`).toMatch(/\bit\s*\(/);
      expect(testSource, `${cardId} engine harness`).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource, `${cardId} observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${cardId} skipped or pending test`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);
      expect(getEffectModule(cardId), `${cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete compiled IR", () => {
    for (const cardId of st13Ids) {
      const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(cardId);

      expect(moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g"))).toHaveLength(1);
      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} total registerIrCard calls`).toHaveLength(1);
      expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    }
  });
});
