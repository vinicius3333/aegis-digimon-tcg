import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-017";

describe("EX11-017 Skadimon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Skadimon",
      colors: ["Blue", "Yellow"],
      playCost: 12,
      dp: 12000,
      level: 6,
      types: ["Ice-Snow", "LIBERATOR"],
      effectText: expect.stringContaining("Suzune Kazuki"),
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Ice-Snow"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
    );
    expect(compiled.effects.filter((effect) => effect.trigger === "AllTurns")[0]).toMatchObject({
      frequency: "OncePerTurn",
    });
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("plays exactly one eligible hand card on play, and shares the once-per-turn use with attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-057", as: "suzune" },
            { card: "EX11-014", as: "iceSnow" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-057")).toBe(true);

    if (s.state.turnSeat === 0) {
      s.engine.applyIntent(0, { type: "endPhase" });
      await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    }
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("uses the public When Attacking timing to play an eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-014", as: "iceSnow" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-014"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    if (s.state.turnSeat === 0) {
      s.engine.applyIntent(0, { type: "endPhase" });
      await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    }
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays Suzune or a level-4-or-lower Ice-Snow card from hand on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-016", as: "base" }],
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-057", as: "suzune" },
            { card: "EX11-014", as: "second" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-057"));
    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-014");
    assertNoLoudGap(s);
  });

  it("rejects ineligible names, levels, and zones for the free-play union", async () => {
    for (const candidate of ["EX11-016", "BT1-033"]) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: cardId, as: "source" },
              { card: candidate, as: "candidate" },
            ],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: { security: ["BT1-012"], deck: ["BT1-013", "BT1-014", "BT1-015"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 20;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain(candidate);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("trashes three cards across opposing stacks and restricts a source-less Digimon after a public opponent play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [{ card: "BT1-010", as: "stacked", under: ["BT1-009", "BT1-011", "BT1-012"] }],
          hand: [{ card: "BT1-013", as: "newcomer" }],
          security: ["BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("newcomer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);
    expect(s.perm("stacked").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "beSuspended")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "suspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("uses Barrier in a real attack against a suspended Skadimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", suspended: true }],
          security: ["BT1-029"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 20000 }],
          security: ["BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("source").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("source").permanentId)).toBe(
      true,
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("uses Ice Clad to win a lower-DP battle by digivolution-card count", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source", dp: 1000, under: ["EX11-014", "EX11-015"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 15000, suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "IceClad")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("defender").permanentId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("supports both normal colors and the Ice-Snow alternate route, and rejects an off-color level 5", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-040", false, 4],
      ["EX12-044", false, 4],
      ["EX11-016", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: cardId, as: "source" }],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT1-009")).toBe(true);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT23-056", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
