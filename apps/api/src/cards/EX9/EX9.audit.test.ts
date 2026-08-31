import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
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
      expect(hasRegisteredCompiledCard(cardId), `${cardId} has no directly registered compiled IR`).toBe(true);
    }
  });

  it("registers each EX9 source module exclusively through its one IR registration", () => {
    for (const cardId of EX9_IDS) {
      const source = readFileSync(new URL(`./${cardId}.ts`, import.meta.url), "utf8");
      expect(
        source.match(new RegExp(`\\bregisterIrCard\\(\\s*["']${cardId}["']`, "g")),
        `${cardId} IR registrations`,
      ).toHaveLength(1);
      expect(source.match(/\bregisterIrCard\s*\(/g), `${cardId} total IR registrations`).toHaveLength(1);
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
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
