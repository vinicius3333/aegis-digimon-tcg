import { getCardDefinition, type DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-061.js";

/**
 * Printed text (BT23, official card list):
 *   [On Play] [On Deletion] 1 of your Digimon with the [Ghost] trait gains <Blocker>
 *   until your opponent's turn ends.
 *   Inherited: [On Deletion] Gain 1 memory.
 *
 * `node tools/kb/query.mjs card BT23-061` returns no knowledge-base entries, so there is no
 * Q&A or errata to cover; the clauses below are proven against the comprehensive rules only.
 */

/** Permanents on `seat` that currently hold a Blocker grant. */
function blockerHolders(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.filter((p) => observe(s.engine).hasKeyword(p, "Blocker")).map(
    (p) => p.permanentId,
  );
}

/** Candidate ids of the first target/select decision, resolved to permanent ids where possible. */
function candidatePermanentIds(s: EngineSetup, req: DecisionRequest): string[] {
  const ids = req.options?.candidateInstanceIds ?? [];
  const all = [
    ...s.state.players[0]!.battleArea,
    ...s.state.players[1]!.battleArea,
    ...(s.state.players[0]!.breeding === undefined ? [] : [s.state.players[0]!.breeding!]),
    ...(s.state.players[1]!.breeding === undefined ? [] : [s.state.players[1]!.breeding!]),
  ];
  return ids.map((id) => {
    const byPermanent = all.find((p) => p.permanentId === id);
    if (byPermanent !== undefined) return byPermanent.permanentId;
    const byTop = all.find((p) => p.topCard?.instanceId === id);
    return byTop?.permanentId ?? id;
  });
}

describe("BT23-061 Ghostmon", () => {
  it("matches every catalog field and the printed clause text", () => {
    expect(getCardDefinition("BT23-061")).toMatchObject({
      cardId: "BT23-061",
      nameEn: "Ghostmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Ghost", "LIBERATOR"],
      effectText:
        "[On Play] [On Deletion] 1 of your Digimon with the [Ghost] trait gains ＜Blocker＞ until your opponent's turn ends.",
      inheritedEffectText: "[On Deletion] Gain 1 memory.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles both windows to one own-Ghost Blocker grant lasting until the opponent's turn ends", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && entry.isInherited !== true);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
          },
          count: 1,
        },
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited === true)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("grants Blocker to itself on a public play from hand, paying the full 3 cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-061", as: "ghostmon" }], deck: ["BT1-010", "BT1-011"] },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const ghostmonId = s.inst("ghostmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ghostmonId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);
    await s.ready();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    const ghostmon = s.perm("ghostmon");
    expect(ghostmon.topCard!.instanceId).toBe(ghostmonId);
    expect(ghostmon.currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(ghostmon, "Blocker")).toBe(true);
    expect(blockerHolders(s, 0)).toEqual([ghostmon.permanentId]);
    assertNoLoudGap(s);
  });

  it("offers only own battle-area Ghost Digimon and grants Blocker to exactly one of them", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-063", as: "otherGhost" },
            { card: "BT1-009", as: "nonGhost" },
          ],
          breeding: { card: "BT20-063", as: "breedingGhost" },
          hand: [{ card: "BT23-061", as: "ghostmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT20-063", as: "opponentGhost" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 3;
    preferred.push(s.perm("otherGhost").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);
    await s.ready();

    const targeting = s.decisions.find(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards");
    expect(targeting).toBeDefined();
    const candidates = candidatePermanentIds(s, targeting!.req);
    expect(candidates).toContain(s.perm("otherGhost").permanentId);
    expect(candidates).toContain(s.perm("ghostmon").permanentId);
    expect(candidates).not.toContain(s.perm("nonGhost").permanentId);
    expect(candidates).not.toContain(s.perm("opponentGhost").permanentId);
    // CR 3-4-5-3: cards in the breeding area cannot be affected by effects that do not name it.
    expect(candidates).not.toContain(s.perm("breedingGhost").permanentId);

    expect(blockerHolders(s, 0)).toEqual([s.perm("otherGhost").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("nonGhost"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentGhost"), "Blocker")).toBe(false);
    expect(blockerHolders(s, 1)).toEqual([]);
    assertNoLoudGap(s);
  });

  it("keeps the Blocker through the opponent's whole turn and drops it on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "otherGhost" }],
          hand: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: { hand: [{ card: "BT1-009", as: "opponentSpare" }], deck: Array(10).fill("BT1-011") },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("ghostmon") !== undefined);
    await s.ready();
    const holders = blockerHolders(s, 0);
    expect(holders).toHaveLength(1);
    const recipient = holders[0]!;

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Still armed through the whole of the opponent's turn.
    expect(blockerHolders(s, 0)).toEqual([recipient]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(blockerHolders(s, 0)).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants Blocker to a surviving Ghost when Ghostmon dies in a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT20-063", as: "otherGhost" },
            { card: "BT1-009", as: "nonGhost" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-021", as: "bigger", suspended: true }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const ghostmonInstanceId = s.perm("ghostmon").topCard!.instanceId;
    const otherGhostId = s.perm("otherGhost").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ghostmonInstanceId),
    );
    await s.ready();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(ghostmonInstanceId);
    expect(blockerHolders(s, 0)).toEqual([otherGhostId]);
    expect(observe(s.engine).hasKeyword(s.perm("nonGhost"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });

  it("resolves the deletion clause with no legal recipient without rejecting anything", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT1-009", as: "nonGhost" },
          ],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-021", as: "bigger", suspended: true }], deck: ["BT1-012"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const ghostmonInstanceId = s.perm("ghostmon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ghostmonInstanceId),
    );
    await s.ready();

    expect(blockerHolders(s, 0)).toEqual([]);
    expect(observe(s.engine).hasKeyword(s.perm("nonGhost"), "Blocker")).toBe(false);
    expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    assertNoLoudGap(s);
  });

  it("gains exactly 1 memory from the inherited clause when a Ghostmon-stacked host dies in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-061", as: "ghostmon" }],
          hand: [{ card: "BT4-080", as: "bakemon" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-021", as: "bigger", suspended: true }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const ghostmonInstanceId = s.inst("ghostmon").instanceId;
    const bakemonId = s.inst("bakemon").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard!.instanceId === bakemonId);
    // Cost 2 paid, Ghostmon is now the digivolution card, and the digivolve draw landed.
    expect(s.state.memory).toBe(0);
    expect(s.perm("ghostmon").stack.map((card) => card.instanceId)).toEqual([ghostmonInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[0]!.trash.some((c) => c.instanceId === bakemonId),
    );
    await s.ready();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([bakemonId, ghostmonInstanceId]),
    );
    // Bakemon has no top-card On Deletion clause, and Ghostmon's own top-card clause is
    // inactive as a digivolution card, so the whole memory swing is the inherited +1.
    expect(s.state.memory).toBe(1);
    expect(blockerHolders(s, 0)).toEqual([]);
    assertNoLoudGap(s);
  });

  it("publicly evolves from a level 2 Purple source for 0 memory and rejects an off-color source", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "egg" },
        hand: [{ card: "BT23-061", as: "ghostmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
      },
    });
    legal.state.memory = 0;
    const eggId = legal.inst("egg").instanceId;
    const ghostmonId = legal.inst("ghostmon").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("egg").permanentId,
        instanceId: ghostmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("egg").topCard!.instanceId === ghostmonId);
    expect(legal.perm("egg").topCard!.instanceId).toBe(ghostmonId);
    expect(legal.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(legal.state.memory).toBe(0);
    expect(legal.state.players[0]!.hand.map((card) => card.instanceId)).toContain(legal.inst("drawn").instanceId);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-002", as: "redEgg" },
        hand: [{ card: "BT23-061", as: "ghostmon" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redEgg").permanentId,
        instanceId: illegal.inst("ghostmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("redEgg").topCard!.cardId).toBe("BT1-002");
    expect(illegal.state.memory).toBe(3);
  });
});
