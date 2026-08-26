import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const EX9_IDS = Array.from({ length: 74 }, (_, index) => `EX9-${String(index + 1).padStart(3, "0")}`);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("EX9 collection registration and IR audit", () => {
  it("registers every catalog card from EX9-001 through EX9-074", () => {
    for (const cardId of EX9_IDS) {
      expect(getEffectModule(cardId), `${cardId} has no registered effect module`).toBeDefined();
    }
  });

  it("keeps every EX9 runtime record fully covered, residual-free, and declarative", () => {
    for (const cardId of EX9_IDS) {
      const compiled = runtimeCompiledCard(cardId);
      expect(compiled, `${cardId} has no compiled IR record`).toBeDefined();
      expect(compiled!.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled!.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} contains RawUnparsed IR`).toBe(false);
    }
  });
});
