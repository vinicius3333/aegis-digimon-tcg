import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const pCards = allCards()
  .filter((card) => /^P-\d{3}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(2)) - Number(b.cardId.slice(2)));
const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));

describe("P collection audit ledger guards", () => {
  it("covers every committed P catalog entry from P-001 through P-244", () => {
    expect(pCards).toHaveLength(243);
    expect(pCards[0]?.cardId).toBe("P-001");
    expect(pCards.at(-1)?.cardId).toBe("P-244");
    expect(pCards.some((card) => card.cardId === "P-226")).toBe(false);
  });

  it("has a registered direct module and compiled IR record for every catalog card", () => {
    const missingModules = pCards
      .filter((card) => getEffectModule(card.cardId) === undefined)
      .map((card) => card.cardId);
    const missingIr = pCards
      .filter((card) => getCompiledCard(card.cardId) === undefined || runtimeCompiledCard(card.cardId) === undefined)
      .map((card) => card.cardId);
    expect(missingModules).toEqual([]);
    expect(missingIr).toEqual([]);
  });

  it("uses exclusive registerIrCard registration in every direct module", () => {
    const violations = pCards
      .filter((card) => {
        const source = readFileSync(`${collectionDirectory}${card.cardId}.ts`, "utf8");
        return !source.includes(`registerIrCard("${card.cardId}", compiled)`) || source.includes("registerCard(");
      })
      .map((card) => card.cardId);
    expect(violations).toEqual([]);
  });

  it("has full executable IR coverage with no residual behavior", () => {
    const observed = pCards
      .filter((card) => {
        const compiled = runtimeCompiledCard(card.cardId);
        return compiled?.coverage !== "full" || (compiled.residual?.length ?? 0) > 0;
      })
      .map((card) => card.cardId);
    expect(observed).toEqual([]);
  });
});
