import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const ex12Ids = Array.from({ length: 77 }, (_, index) => `EX12-${String(index + 1).padStart(3, "0")}`);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
}

describe("EX12 persisted IR", () => {
  it("contains exactly the authoritative EX12 card keys", () => {
    const persistedCardIds = Object.keys(catalog)
      .filter((cardId) => /^EX12-\d{3}$/.test(cardId))
      .sort();

    expect(persistedCardIds).toEqual(ex12Ids);
  });

  it("keeps every record synchronized with its authoritative module", () => {
    const mismatches = ex12Ids.filter(
      (cardId) => canonical(catalog[cardId]) !== canonical(runtimeCompiledCard(cardId)),
    );

    expect(mismatches).toEqual([]);
  });

  it.each(ex12Ids)("keeps %s at full coverage with no residual prose", (cardId) => {
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });
});
