import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-202.js";
import "../BT1/BT1-076.js";

describe("P-202 Tyrannomon", () => {
  it("requires a level 3 DM Digimon and has Training", () => {
    const card = runtimeCompiledCard("P-202")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]);
    expect(card.effects.find((effect) => !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Training", raw: "＜Training＞" }],
    });
  });

  it("reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", suspended: true, kind: ["Digimon"] },
          into: {
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur", "Ver.1"], match: "trait" },
            ],
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("preserves inherited Piercing", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    });
  });

  it("exposes Training on the live Tyrannomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-202", as: "tyranno" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tyranno"), "Training")).toBe(true);
  });

  it("carries inherited Piercing into a real battle from a legal Green stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-076", as: "host", under: [{ card: "P-202", as: "source" }] }],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }],
          deck: Array(20).fill("BT1-009"),
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("discounts the first suspended evolution, charges full cost after de-digivolve, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-016", as: "evolver1" },
            { card: "BT1-016", as: "evolver2" },
            { card: "BT1-016", as: "evolver3" },
          ],
          battleArea: [
            { card: "P-202", as: "tyranno" },
            { card: "BT1-009", suspended: true, as: "base" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: { hand: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const basePermanentId = s.perm("base").permanentId;
    const baseInstanceId = s.inst("base").instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([basePermanentId]);
    const tyrannoPermanentId = s.perm("tyranno").permanentId;
    const tyrannoInstanceId = s.perm("tyranno").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver1").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver1").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 9, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);

    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(basePermanentId, 1);
    await settle(() => s.perm("base").topCard.instanceId === baseInstanceId);
    await advance(s.engine).verb.suspend([basePermanentId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver2").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver2").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 9, to: 7, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(basePermanentId, 1);
    await settle(() => s.perm("base").topCard.instanceId === baseInstanceId);
    await advance(s.engine).verb.suspend([basePermanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver3").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 3, to: 2, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").permanentId).toBe(basePermanentId);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
