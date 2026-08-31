import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st12Cards = allCards()
  .filter((card) => card.set === "ST12")
  .sort((left, right) => left.cardId.localeCompare(right.cardId));
const st12Ids = st12Cards.map((card) => card.cardId);
const expectedIds = Array.from({ length: 16 }, (_, index) => `ST12-${String(index + 1).padStart(2, "0")}`);
const vanillaIds = new Set(["ST12-02", "ST12-05", "ST12-07"]);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

function hasDirectIrRegistration(source: string, cardId: string): boolean {
  const literalRegistration = new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`).test(
    source,
  );
  const boundRegistration =
    new RegExp(`\\bconst\\s+cardId\\s*=\\s*["']${cardId}["']\\s*;`).test(source) &&
    /\bregisterIrCard\s*\(\s*cardId\s*,\s*compiled\s*\)/.test(source);
  return literalRegistration || boundRegistration;
}

describe("ST12 collection audit gate", () => {
  it("has the exact committed ST12 catalog inventory in ascending order", () => {
    expect(st12Ids).toEqual(expectedIds);
  });

  it("keeps every catalog card imported with focused behavioral evidence", () => {
    for (const card of st12Cards) {
      const testSource = readFileSync(`${collectionDirectory}${card.cardId}.test.ts`, "utf8");

      expect(
        indexSource.match(new RegExp(`^import "\\./${card.cardId}\\.js";$`, "gm")),
        `${card.cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${card.cardId} focused suite`).toMatch(
        new RegExp(`^describe\\s*\\(\\s*["']${card.cardId}(?=\\s|["'])`, "m"),
      );
      expect(testSource, `${card.cardId} runnable focused case`).toMatch(/\bit\s*\(/);
      expect(testSource, `${card.cardId} focused engine harness`).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource, `${card.cardId} focused observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${card.cardId} skipped or pending case`).not.toMatch(
        /\b(?:describe|it|test)\.(?:skip|todo)\s*\(/,
      );
      expect(getEffectModule(card.cardId), `${card.cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete residual-free compiled IR", () => {
    for (const card of st12Cards) {
      const moduleSource = readFileSync(`${collectionDirectory}${card.cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(card.cardId);

      expect(hasDirectIrRegistration(moduleSource, card.cardId), `${card.cardId} direct IR`).toBe(true);
      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${card.cardId} IR registration count`).toHaveLength(1);
      expect(moduleSource, `${card.cardId} legacy registration`).not.toMatch(/\bregisterCard\s*\(/);
      expect(hasRegisteredCompiledCard(card.cardId), `${card.cardId} runtime registration`).toBe(true);
      expect(getCompiledCard(card.cardId), `${card.cardId} committed IR`).toBeDefined();
      expect(compiled?.coverage, `${card.cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${card.cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${card.cardId} RawUnparsed node`).toBe(false);
      const effectCount = compiled?.effects.length ?? -1;
      expect(
        vanillaIds.has(card.cardId) ? effectCount === 0 : effectCount > 0,
        `${card.cardId} ${vanillaIds.has(card.cardId) ? "vanilla" : "executable"} effects`,
      ).toBe(true);
    }
  });
});
