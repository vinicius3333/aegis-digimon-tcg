import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const BT16_IDS = Array.from({ length: 102 }, (_, index) => `BT16-${String(index + 1).padStart(3, "0")}`);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("BT16 collection IR audit", () => {
  it("registers every catalog card", () => {
    for (const cardId of BT16_IDS) {
      expect(getEffectModule(cardId), `${cardId} has no registered effect module`).toBeDefined();
    }
  });

  it("keeps every runtime card fully covered and residual-free", () => {
    for (const cardId of BT16_IDS) {
      const compiled = runtimeCompiledCard(cardId);
      expect(compiled, `${cardId} has no runtime compiled card`).toBeDefined();
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} contains RawUnparsed IR`).toBe(false);
    }
  });
});
