import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-029.js";
import "../index.js";

describe("EX5-029 Reppamon", () => {
  it("matches the catalog and encodes both When Attacking clauses", () => {
    expect(getCardDefinition("EX5-029")).toMatchObject({
      cardId: "EX5-029",
      nameEn: "Reppamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      types: ["Holy Beast"],
      effectText: expect.stringContaining("By trashing the top card of your security stack"),
      inheritedEffectText: expect.stringContaining("6 or fewer total cards in both players' security stacks"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 2,
          duration: "nextDigivolveThisTurn",
          optional: false,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -2000,
          duration: "forTheTurn",
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
        },
      ],
    });
  });

  it("publicly trashes its top security card and reduces the next yellow evolution by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-029", as: "reppamon" },
            { card: "BT1-050", as: "evolutionBase" },
          ],
          hand: [
            { card: "BT1-051", as: "evolving" },
            { card: "BT1-058", as: "handWitness" },
          ],
          security: [{ card: "BT1-009", as: "paidSecurity" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("paidSecurity").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolutionBase").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionBase").topCard?.cardId === "BT1-051");
    expect(s.state.memory).toBe(3);
    expect(s.perm("evolutionBase").stack.map((card) => card.cardId)).toEqual(["BT1-050"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handWitness").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    [3, 3, 3000],
    [4, 3, 5000],
  ] as const)(
    "uses both security stacks for the inherited six-card threshold (%i + %i)",
    async (own, opponent, expectedDp) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-029"] }],
          security: Array.from({ length: own }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }],
          security: Array.from({ length: opponent }, () => "BT1-009"),
        },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.perm("target").currentDP).toBe(expectedDp);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not reduce an unrelated evolution when Reppamon has not attacked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-029", as: "reppamon" },
          { card: "BT1-050", as: "evolutionBase" },
        ],
        hand: [{ card: "BT1-051", as: "evolving" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolutionBase").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionBase").topCard?.cardId === "BT1-051");
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
