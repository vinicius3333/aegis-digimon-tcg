import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st23Ids = allCards()
  .filter((card) => /^ST23-\d{2}$/.test(card.cardId))
  .map((card) => card.cardId)
  .sort();
const expectedIds = Array.from({ length: 15 }, (_, index) => `ST23-${String(index + 1).padStart(2, "0")}`);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

function effects(cardId: string) {
  const card = runtimeCompiledCard(cardId);
  expect(card, `${cardId} must execute through compiled IR`).toBeDefined();
  expect(card?.coverage, `${cardId} must have full IR coverage`).toBe("full");
  expect(card?.residual, `${cardId} must have no unresolved IR residual`).toEqual([]);
  return card!.effects;
}

describe("ST23 collection audit gate", () => {
  it("has the exact committed catalog inventory in ascending order", () => {
    expect(st23Ids).toEqual(expectedIds);
  });

  it("keeps every catalog card imported with a focused behavioral test", () => {
    for (const cardId of st23Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");
      expect(
        indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")),
        `${cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${cardId} test suite`).toMatch(/\bdescribe\s*\(/);
      expect(testSource, `${cardId} runnable proof`).toMatch(/\bit\s*\(/);
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
    expect(effects(cardId).length, `${cardId} executable behavior`).toBeGreaterThan(0);
  });

  it("keeps the published ST23 ruling-sensitive clauses executable", () => {
    expect(effects("ST23-03").find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", amount: 1 },
      { kind: "SecurityManipulation", op: "addTop", source: "deck", amount: 1 },
    ]);
    expect(effects("ST23-05").find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      affectsAll: true,
      cost: { kind: "trashSecurityTop" },
    });
    expect(effects("ST23-06").find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "underTamer", faceDown: true },
      ],
    });
    expect(effects("ST23-09").find((effect) => effect.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects" },
      { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
    ]);
    for (const cardId of ["ST23-13", "ST23-14"]) {
      expect(effects(cardId).find((effect) => effect.trigger === "Security")).toMatchObject({
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", payCost: false }],
      });
    }
  });
});
