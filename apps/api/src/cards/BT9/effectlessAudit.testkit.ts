import { getCardDefinition } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

export function auditEffectlessDigimon({
  cardId,
  expected,
  compiled,
  validBase,
  validEgg,
  invalidBase,
}: {
  cardId: string;
  expected: Record<string, unknown> & {
    nameEn?: string;
    playCost?: number;
    evoCosts?: Array<{ memoryCost: number } & Record<string, unknown>>;
  };
  compiled: CompiledCard;
  validBase: string;
  validEgg?: string;
  invalidBase: string;
}): void {
  describe(`${cardId} ${String(expected.nameEn)}`, () => {
    it("matches the complete effectless catalog and IR contract", () => {
      expect(getCardDefinition(cardId)).toMatchObject(expected);
      expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    });
    it("digivolves through the printed recipe and pays its exact cost", async () => {
      const evolution = expected.evoCosts?.[0];
      if (evolution === undefined) throw new Error(`${cardId} has no catalog evolution recipe`);
      const baseEvolutionCost = validEgg === undefined ? 0 : getCardDefinition(validBase)?.evoCosts?.[0]?.memoryCost;
      const directBaseIsEgg =
        validEgg === undefined && getCardDefinition(validBase)?.kinds.includes("DigiEgg" as never);
      if (baseEvolutionCost === undefined) throw new Error(`${validBase} has no catalog evolution recipe`);
      const s = setupEngine({
        0:
          validEgg === undefined
            ? {
                ...(directBaseIsEgg
                  ? { breeding: { card: validBase, as: "base" } }
                  : { battleArea: [{ card: validBase, as: "base" }] }),
                hand: [{ card: cardId, as: "evolving" }],
              }
            : {
                breeding: { card: validEgg, as: "base" },
                hand: [
                  { card: validBase, as: "legalBase" },
                  { card: cardId, as: "evolving" },
                ],
              },
      });
      s.state.memory = baseEvolutionCost + evolution.memoryCost;
      const legalBaseResult =
        validEgg === undefined
          ? { ok: true }
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("legalBase").instanceId,
            });
      expect(legalBaseResult).toEqual({ ok: true });
      if (validEgg !== undefined) {
        await settle(() => s.perm("base").topCard.instanceId === s.inst("legalBase").instanceId);
      }
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
      expect(s.state.memory).toBe(0);
      const expectedStack = validEgg === undefined ? undefined : [validEgg, validBase];
      expect(expectedStack === undefined ? undefined : s.perm("base").stack.map((card) => card.cardId)).toEqual(
        expectedStack,
      );
    });
    it("plays for the printed cost and reaches the battle area without opening an effect", async () => {
      const playCost = expected.playCost!;
      const s = setupEngine({ 0: { hand: [{ card: cardId, as: "played" }] } });
      s.state.memory = playCost;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 1);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("played").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    });
    it("rejects a same-level base outside the printed color recipe", () => {
      const evolution = expected.evoCosts?.[0];
      if (evolution === undefined) throw new Error(`${cardId} has no catalog evolution recipe`);
      const invalidBaseIsEgg = getCardDefinition(invalidBase)?.kinds.includes("DigiEgg" as never);
      const s = setupEngine({
        0: {
          ...(invalidBaseIsEgg
            ? { breeding: { card: invalidBase, as: "base" } }
            : { battleArea: [{ card: invalidBase, as: "base" }] }),
          hand: [{ card: cardId, as: "evolving" }],
        },
      });
      s.state.memory = evolution.memoryCost;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.memory).toBe(evolution.memoryCost);
      expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolving").instanceId)).toBe(
        true,
      );
    });
  });
}
