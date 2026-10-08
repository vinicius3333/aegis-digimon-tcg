import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
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
          optional: true,
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

  it("publicly trashes its top security card and reduces the next evolution by two", async () => {
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
    { simultaneous: false, accept: false },
    { simultaneous: false, accept: true },
    { simultaneous: true, accept: false },
    { simultaneous: true, accept: true },
  ])(
    "Discord 1557251527851114516: consent controls security payment and the one-shot reduction (simultaneous=$simultaneous, accept=$accept)",
    async ({ simultaneous, accept }) => {
      const options = { autoOrderTriggers: !simultaneous, autoSelectCards: true };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX5-029", as: "reppamon", under: simultaneous ? ["EX5-029"] : [] },
              { card: "BT1-050", as: "firstBase" },
              { card: "BT1-050", as: "secondBase" },
            ],
            hand: [
              { card: "BT1-051", as: "firstEvolution" },
              { card: "BT1-051", as: "secondEvolution" },
              { card: "BT1-058", as: "handWitness" },
            ],
            security: [
              { card: "BT1-009", as: "topSecurity" },
              { card: "BT1-010", as: "secondSecurity" },
            ],
          },
          1: {
            security: ["BT1-009", "BT1-010"],
            battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }],
          },
        },
        options,
      );
      await s.ready();
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("reppamon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === (simultaneous ? "orderTriggers" : "optional"));
      const decision = s.decisions.at(-1)!.req;
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
        s.inst("topSecurity").instanceId,
        s.inst("secondSecurity").instanceId,
      ]);

      const keys = decision.options?.triggerKeys ?? [];
      const costIndex = decision.options?.triggerDescriptions?.findIndex((text) => text.includes("By trashing")) ?? -1;
      expect(decision.kind).toBe(simultaneous ? "orderTriggers" : "optional");
      expect(decision.sourceCardId).toBe("EX5-029");
      expect(costIndex >= 0).toBe(simultaneous);
      expect(decision.options?.triggerIsOptional?.[costIndex] ?? false).toBe(simultaneous);
      const response: DecisionResponse = simultaneous
        ? { kind: "orderTriggers", order: keys, optionalAnswers: { [keys[costIndex]!]: accept } }
        : { kind: "optional", accept };
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response })).toEqual({
        ok: true,
      });
      options.autoOrderTriggers = true;
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      const expectedSecurity = accept
        ? [s.inst("secondSecurity").instanceId]
        : [s.inst("topSecurity").instanceId, s.inst("secondSecurity").instanceId];
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(expectedSecurity);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId)).toBe(
        accept,
      );
      expect(s.perm("target").currentDP).toBe(simultaneous ? 3000 : 5000);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("firstBase").permanentId,
          instanceId: s.inst("firstEvolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("firstBase").topCard?.cardId === "BT1-051" && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(accept ? 6 : 4);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("secondBase").permanentId,
          instanceId: s.inst("secondEvolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("secondBase").topCard?.cardId === "BT1-051" && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(accept ? 4 : 2);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(expectedSecurity);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("handWitness").instanceId);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX5-029" && req.kind === "optional")).toHaveLength(
        simultaneous ? 0 : 1,
      );
    },
  );

  it("Discord 1557251527851114516: no security to pay gives no free digivolution reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-029", as: "reppamon" },
            { card: "BT1-050", as: "evolutionBase" },
          ],
          hand: [{ card: "BT1-051", as: "evolving" }],
          security: [],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX5-029" && req.kind === "optional")).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolutionBase").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionBase").topCard?.cardId === "BT1-051" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
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

describe("EX5-029 Reppamon — KB Q&A rulings", () => {
  it.each([
    { own: 2, opponent: 4, expectedDp: 3000 },
    { own: 5, opponent: 2, expectedDp: 5000 },
  ])(
    "adds both players' security stacks for the six-card threshold ($own + $opponent) (Q3593)",
    async ({ own, opponent, expectedDp }) => {
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
    },
  );
});
