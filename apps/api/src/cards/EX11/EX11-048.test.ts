import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../BT19/BT19-050.js";

const cardId = "EX11-048";

describe("EX11-048 Ghostmon", () => {
  it("preserves the printed card, Ghost targeting, Retaliation duration, and inherited memory", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Ghostmon",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      types: ["Ghost", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((candidate) => candidate.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        duration: "untilOpponentTurnEnd",
        keyword: { keyword: "Retaliation" },
        target: {
          count: 1,
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        },
      });
    }
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("gives Retaliation to 1 own Ghost but never a near-matching non-Ghost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          battleArea: [
            { card: "BT20-063", as: "ghost" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(
      [s.perm("source"), s.perm("ghost")].filter((card) => observe(s.engine).hasKeyword(card, "Retaliation")),
    ).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Retaliation")).toBe(false);
    assertNoLoudGap(s);
  });

  it("grants Retaliation through the public move-from-breeding action", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          battleArea: [
            { card: "BT20-063", as: "ghost" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === "Main" && s.perm("source").inBreeding === false);
    expect(observe(s.engine).hasKeyword(s.perm("ghost"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Retaliation")).toBe(false);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("hatches a legal egg publicly before the breeding transition boundary", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          hand: [{ card: cardId, as: "ghostmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("exposes the public inherited-deletion seam on a legal egg-derived Ghostmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX11-005", as: "egg" },
          hand: [
            { card: cardId, as: "ghostmon" },
            { card: "BT11-078", as: "host" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "attacker", dp: 15000 }],
          hand: [{ card: "BT19-050", as: "suspender" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("ghostmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === cardId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT11-078");

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("egg").isSuspended);
    const memoryBeforeBattle = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("egg").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("egg").permanentId),
    );
    await settle(() => s.state.memory === memoryBeforeBattle - 1);
    // Seat 1 is the active opponent, so seat 0's +1 memory is represented by a -1
    // shared-gauge delta. This proves the inherited On Deletion resolved after battle.
    expect(s.state.memory).toBe(memoryBeforeBattle - 1);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual(expect.arrayContaining(["BT11-078", cardId]));
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
