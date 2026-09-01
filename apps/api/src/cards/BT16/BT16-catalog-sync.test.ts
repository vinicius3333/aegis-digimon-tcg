import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const bt16Directory = fileURLToPath(new URL(".", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const cardIds = Array.from({ length: 102 }, (_, index) => `BT16-${String(index + 1).padStart(3, "0")}`);

describe("BT16 persisted IR", () => {
  it("has exactly the 102 BT16 catalog records", () => {
    expect(
      Object.keys(catalog)
        .filter((cardId) => cardId.startsWith("BT16-"))
        .sort(),
    ).toEqual(cardIds);
  });

  it.each(cardIds)("keeps %s synchronized with its authoritative module", (cardId) => {
    expect(hasRegisteredCompiledCard(cardId)).toBe(true);
    const compiled = runtimeCompiledCard(cardId);
    expect(compiled).toBeDefined();
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });

  it("has exactly 102 IR-only production modules", () => {
    const productionFiles = readdirSync(bt16Directory)
      .filter((fileName) => /^BT16-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt16Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });
});
