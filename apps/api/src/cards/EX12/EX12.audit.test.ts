import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const ex12Ids = allCards()
  .filter((card) => card.set === "EX12")
  .map((card) => card.cardId)
  .sort();

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
      expect(indexSource.match(new RegExp(`\\./${cardId}\\.js`, "g")), `${cardId} index import`).toHaveLength(1);
      expect(readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8"), `${cardId} behavioral test`).toMatch(
        /setupEngine\(/,
      );
      expect(getEffectModule(cardId), `${cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete compiled IR", () => {
    for (const cardId of ex12Ids) {
      const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(cardId);

      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} registerIrCard calls`).toHaveLength(1);
      expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
      expect(compiled, `${cardId} runtime compiled record`).toBeDefined();
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    }
  });
});
