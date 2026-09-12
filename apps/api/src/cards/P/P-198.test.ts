import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-198.js";

describe("P-198 DemiDevimon", () => {
  it("encodes free Fallen Angel or TS hand digivolution at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-198")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
          into: { nameOrTrait: [{ tokens: ["Fallen Angel", "TS"], match: "trait" }] },
        },
      ],
    });
  });

  it("has the TS evolution requirement and inherited once-per-turn Draw 1 then hand trash", () => {
    const inherited = runtimeCompiledCard("P-198")!.effects.find((effect) => effect.isInherited)!;
    expect(runtimeCompiledCard("P-198")!.digivolutionRequirement).toEqual([
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
    expect(inherited).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      ],
    });
  });

  it("draws and trashes once per turn across a natural three-attack cycle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: [{ card: "P-198", as: "source" }] }],
          hand: [
            { card: "BT1-009", as: "firstTrashCandidate" },
            { card: "BT1-009", as: "secondTrashCandidate" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: [
            { card: "BT1-108", as: "firstDrawCard" },
            { card: "BT1-108", as: "futureNaturalDrawCard" },
            { card: "BT1-108", as: "futureThirdESSDrawCard" },
            ...Array.from({ length: 17 }, () => "BT1-108"),
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    preferred.push(s.inst("firstTrashCandidate").instanceId);
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
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(1);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDrawCard").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstTrashCandidate").instanceId)).toBe(
      true,
    );
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(2);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDrawCard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondTrashCandidate").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstTrashCandidate").instanceId)).toBe(
      true,
    );
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);

    await advance(s.engine).verb.unsuspend([hostId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("futureNaturalDrawCard").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    preferred.push(s.inst("futureThirdESSDrawCard").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(3);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("futureNaturalDrawCard").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("futureThirdESSDrawCard").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it.each([4, 5])("handles the printed Start of Main memory boundary at %s memory", async (memory) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-198", as: "demidevimon" }], hand: [{ card: "P-194", as: "aegio" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = memory;
    await s.ready();
    const hostId = s.perm("demidevimon").permanentId;
    const sourceId = s.inst("demidevimon").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () => s.perm("demidevimon").topCard.instanceId === (memory === 4 ? s.inst("aegio").instanceId : sourceId),
    );
    expect(s.perm("demidevimon").topCard.instanceId).toBe(memory === 4 ? s.inst("aegio").instanceId : sourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aegio").instanceId)).toBe(memory === 5);
    expect(s.perm("demidevimon").permanentId).toBe(hostId);
    expect(s.perm("demidevimon").stack.some((card) => card.instanceId === sourceId)).toBe(memory === 4);
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
