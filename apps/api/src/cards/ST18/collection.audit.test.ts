import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st18Ids = allCards()
  .filter((card) => card.set === "ST18")
  .map((card) => card.cardId)
  .sort();

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("ST18 collection audit proof", () => {
  it("matches the complete committed ST18 catalog inventory", () => {
    expect(st18Ids).toEqual(Array.from({ length: 15 }, (_, index) => `ST18-${String(index + 1).padStart(2, "0")}`));
  });

  it("keeps every catalog card imported, structurally backed by focused evidence, and executable", () => {
    for (const cardId of st18Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");

      expect(
        indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")),
        `${cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${cardId} focused evidence suite`).toMatch(
        new RegExp(`^describe\\s*\\(\\s*["']${cardId}(?=\\s|["'])`, "m"),
      );
      expect(testSource, `${cardId} runnable focused case`).toMatch(/\bit\s*\(/);
      expect(testSource, `${cardId} focused engine harness`).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource, `${cardId} focused observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${cardId} skipped or pending focused case`).not.toMatch(
        /\b(?:describe|it|test)\.(?:skip|todo)\s*\(/,
      );
      expect(getEffectModule(cardId), `${cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete compiled IR", () => {
    for (const cardId of st18Ids) {
      const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(cardId);

      expect(
        moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g")),
      ).toHaveLength(1);
      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} total registerIrCard calls`).toHaveLength(1);
      expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    }
  });
});
