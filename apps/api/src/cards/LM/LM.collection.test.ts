import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

/**
 * Collection gate for the LM (Liberator/Limited) set, run alongside the 62 per-card suites.
 *
 * The individual card files remain the behavioral source of truth; this guard fails the build
 * if a card silently drops out of the runtime registry, stops owning an inline compiled record,
 * or regains an incomplete-coverage marker — the three properties the card-by-card audit
 * asserts one file at a time.
 */
const LM_CARDS = allCards().filter((card) => /^LM-\d+$/.test(card.cardId));

describe("LM collection gate", () => {
  it.each(LM_CARDS)("registers $cardId exclusively once through compiled IR", ({ cardId }) => {
    const source = readFileSync(fileURLToPath(new URL(`./${cardId}.ts`, import.meta.url)), "utf8");
    expect(source).not.toMatch(/\bregisterCard\s*\(/);
    expect(source.match(/\bregisterIrCard\s*\(/g)).toHaveLength(1);
    expect(source).toContain(`registerIrCard("${cardId}", compiled)`);
  });

  it("registers all 62 committed catalog cards", () => {
    expect(LM_CARDS).toHaveLength(62);

    const missing = LM_CARDS.filter((card) => getEffectModule(card.cardId) === undefined).map((card) => card.cardId);
    expect(missing).toEqual([]);
  });

  it("owns an inline compiled record for every card, with full coverage and no residual", () => {
    const withoutInline = LM_CARDS.filter((card) => !hasRegisteredCompiledCard(card.cardId)).map((c) => c.cardId);
    expect(withoutInline).toEqual([]);

    const incomplete = LM_CARDS.filter((card) => {
      const compiled = runtimeCompiledCard(card.cardId);
      return compiled === undefined || compiled.coverage !== "full" || (compiled.residual ?? []).length > 0;
    }).map((card) => card.cardId);
    expect(incomplete).toEqual([]);
  });

  it("keeps every printed surface backed by at least one compiled effect", () => {
    const surfaceless = LM_CARDS.filter((card) => {
      const printed = [card.effectText, card.inheritedEffectText, card.securityEffectText].filter(
        (text) => typeof text === "string" && text.trim().length > 0,
      );
      if (printed.length === 0) return false;
      return (runtimeCompiledCard(card.cardId)?.effects ?? []).length === 0;
    }).map((card) => card.cardId);
    expect(surfaceless).toEqual([]);
  });

  it("carries an inherited effect for every card that prints one", () => {
    const missingInherited = LM_CARDS.filter((card) => {
      const printed = card.inheritedEffectText;
      if (typeof printed !== "string" || printed.trim().length === 0) return false;
      return !(runtimeCompiledCard(card.cardId)?.effects ?? []).some((effect) => effect.isInherited === true);
    }).map((card) => card.cardId);
    expect(missingInherited).toEqual([]);
  });

  it("carries a Security effect for every card that prints one", () => {
    const missingSecurity = LM_CARDS.filter((card) => {
      const printed = card.securityEffectText;
      if (typeof printed !== "string" || printed.trim().length === 0) return false;
      return !(runtimeCompiledCard(card.cardId)?.effects ?? []).some((effect) => effect.isSecurity === true);
    }).map((card) => card.cardId);
    expect(missingSecurity).toEqual([]);
  });
});
