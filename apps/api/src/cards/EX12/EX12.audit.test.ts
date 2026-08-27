import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const auditLedgerSource = readFileSync(new URL("./AUDIT.md", import.meta.url), "utf8");
const ex12Cards = allCards()
  .filter((card) => card.set === "EX12")
  .sort((left, right) => left.cardId.localeCompare(right.cardId));
const ex12Ids = ex12Cards.map((card) => card.cardId);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("EX12 collection audit proof", () => {
  it("matches the complete committed EX12 catalog inventory", () => {
    const expectedIds = Array.from({ length: 77 }, (_, index) => `EX12-${String(index + 1).padStart(3, "0")}`);

    expect(ex12Ids).toEqual(expectedIds);
  });

  it("keeps every card imported with a direct module and colocated behavioral test", () => {
    for (const cardId of ex12Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");

      expect(
        indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")),
        `${cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${cardId} test suite`).toMatch(/\bdescribe\s*\(/);
      expect(testSource, `${cardId} runnable test`).toMatch(/\bit\s*\(/);
      expect(testSource, `${cardId} engine harness`).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource, `${cardId} observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${cardId} skipped or pending test`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);
      expect(getEffectModule(cardId), `${cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete compiled IR", () => {
    for (const cardId of ex12Ids) {
      const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(cardId);

      expect(
        moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g")),
        `${cardId} exact registerIrCard call`,
      ).toHaveLength(1);
      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} total registerIrCard calls`).toHaveLength(1);
      expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(compiled, `${cardId} runtime compiled record`).toBeDefined();
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    }
  });

  it("documents every audited card as 10/10 in the versioned ledger", () => {
    const rows = auditLedgerSource
      .split("\n")
      .filter((line) => /^\| EX12-\d{3} \|/.test(line))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );

    expect(auditLedgerSource).toContain("Overall completion: **77/77 cards (100%) at 10/10**.");
    expect(rows).toHaveLength(ex12Cards.length);

    for (const [index, card] of ex12Cards.entries()) {
      const cardId = card.cardId;

      expect(rows[index], `${cardId} audit ledger row`).toEqual([
        cardId,
        card.nameEn,
        "2/2",
        "2/2",
        "2/2",
        "2/2",
        "2/2",
        "10/10",
        `[\`${cardId}.ts\`](./${cardId}.ts) · [\`${cardId}.test.ts\`](./${cardId}.test.ts)`,
      ]);
    }
  });
});
