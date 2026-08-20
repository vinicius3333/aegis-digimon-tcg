import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const BT18_IDS = Array.from({ length: 102 }, (_, index) => `BT18-${String(index + 1).padStart(3, "0")}`);

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

describe("BT18 collection registration and IR audit", () => {
  it("registers every catalog card from BT18-001 through BT18-102", () => {
    for (const cardId of BT18_IDS) {
      expect(getEffectModule(cardId), `${cardId} has no registered effect module`).toBeDefined();
    }
  });

  it("keeps every declarative BT18 runtime record fully covered and residual-free", () => {
    for (const cardId of BT18_IDS) {
      const compiled = runtimeCompiledCard(cardId);
      if (compiled === undefined) continue; // Hand-authored modules are audited by their module tests.
      expect(compiled.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} contains RawUnparsed IR`).toBe(false);
    }
  });
});
