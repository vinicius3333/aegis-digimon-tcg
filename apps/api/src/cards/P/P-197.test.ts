import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-197.js";

describe("P-197 Patamon", () => {
  it("encodes free Angel or TS hand digivolution at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-197")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
          into: { nameOrTrait: [{ tokens: ["Angel", "TS"], match: "trait" }] },
        },
      ],
    });
  });

  it("has the TS evolution requirement and inherited once-per-turn -2000 DP attack effect", () => {
    const card = runtimeCompiledCard("P-197")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("reduces an opposing Digimon by 2000 when its inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["P-197"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          security: Array.from({ length: 5 }, () => "BT1-009"),
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          battleArea: [{ card: "BT1-039", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const combatBeforeFirst = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > combatBeforeFirst &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const combatBeforeSecond = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > combatBeforeSecond &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const combatBeforeThird = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > combatBeforeThird &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([4, 5])("handles the printed Start of Main memory boundary at %s memory", async (memory) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-197", as: "patamon" }], hand: [{ card: "P-194", as: "aegio" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = memory;
    await s.ready();
    const hostId = s.perm("patamon").permanentId;
    const sourceId = s.inst("patamon").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("patamon").topCard.instanceId === (memory === 4 ? s.inst("aegio").instanceId : sourceId));
    expect(s.perm("patamon").topCard.instanceId).toBe(memory === 4 ? s.inst("aegio").instanceId : sourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aegio").instanceId)).toBe(memory === 5);
    expect(s.perm("patamon").permanentId).toBe(hostId);
    expect(s.perm("patamon").stack.some((card) => card.instanceId === sourceId)).toBe(memory === 4);
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
