import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-196.js";

describe("P-196 Gomamon", () => {
  it("requires a level 2 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-196")!.digivolutionRequirement).toEqual([
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
  });

  it("allows free Sea Beast or TS hand digivolution at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-196")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
          into: { nameOrTrait: [{ tokens: ["Sea Beast", "TS"], match: "trait" }] },
        },
      ],
    });
  });

  it("draws once per turn when attacking with seven or fewer hand cards", () => {
    expect(runtimeCompiledCard("P-196")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
  });

  it("draws once per turn across a real three-attack cycle and resets naturally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: [{ card: "P-196", as: "source" }] }],
          hand: [
            { card: "BT1-009", as: "playableFirst" },
            { card: "BT1-009", as: "playableSecond" },
            "ST1-16",
            "ST1-16",
            "BT1-101",
            "BT1-101",
            "BT10-105",
          ],
          deck: Array.from({ length: 20 }, () => "BT1-108"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const finishAttack = async (checkCount: number): Promise<void> => {
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === checkCount &&
          s.state.pendingDecision === undefined &&
          !observe(s.engine).isAttacking(),
      );
      const checked = s.events.filter((event) => event.kind === "securityChecked").at(-1);
      expect(checked).toMatchObject({ kind: "securityChecked", revealedCardId: "BT1-009" });
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.perm("host").permanentId).toBe(hostId);
      expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    };

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(1);
    expect(s.state.players[0]!.hand.length).toBe(8);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playableFirst").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("playableFirst").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(2);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    await advance(s.engine).verb.unsuspend([hostId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playableSecond").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("playableSecond").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand).toHaveLength(7);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(3);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it.each([4, 5])("handles the printed Start of Main memory boundary at %s memory", async (memory) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-196", as: "gomamon" }], hand: [{ card: "P-194", as: "aegio" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = memory;
    await s.ready();
    const hostId = s.perm("gomamon").permanentId;
    const sourceId = s.inst("gomamon").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("gomamon").topCard.instanceId === (memory === 4 ? s.inst("aegio").instanceId : sourceId));
    expect(s.perm("gomamon").topCard.instanceId).toBe(memory === 4 ? s.inst("aegio").instanceId : sourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aegio").instanceId)).toBe(memory === 5);
    expect(s.perm("gomamon").permanentId).toBe(hostId);
    expect(s.perm("gomamon").stack.some((card) => card.instanceId === sourceId)).toBe(memory === 4);
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
