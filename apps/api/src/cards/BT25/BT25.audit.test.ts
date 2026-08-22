import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

type CatalogCard = { cardId: string; set: string };

const cardsPath = fileURLToPath(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url));
const cards = JSON.parse(readFileSync(cardsPath, "utf8")) as CatalogCard[];
const bt25Ids = cards
  .filter((card) => card.set === "BT25")
  .map((card) => card.cardId)
  .sort();

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("BT25 collection registration and IR audit", () => {
  it("registers every catalog card through an executable module", () => {
    expect(bt25Ids).toHaveLength(104);
    for (const cardId of bt25Ids) {
      expect(getEffectModule(cardId), `${cardId} has no registered effect module`).toBeDefined();
    }
  });

  it("keeps every BT25 runtime record full and residual-free", () => {
    for (const cardId of bt25Ids) {
      const compiled = runtimeCompiledCard(cardId);
      expect(compiled, `${cardId} has no runtime compiled record`).toBeDefined();
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} contains RawUnparsed IR`).toBe(false);
    }
  });
});
