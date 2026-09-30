import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-054.js";
import "../index.js";

describe("BT25-054 GreatGrizzlymon", () => {
  it("digivolves into Callismon after winning a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-054", as: "source" }], hand: [{ card: "BT25-058", as: "evolver" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-058");
    expect(s.perm("source").topCard?.cardId).toBe("BT25-058");
  });

  it("does not digivolve when another friendly Digimon wins the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-054", as: "source" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: "BT25-058", as: "evolver" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").topCard?.cardId).toBe("BT25-054");
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("evolver"));
  });

  it("digivolves into Marsmon after winning a security battle (Q6333)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-054", as: "source" }], hand: [{ card: "BT25-020", as: "evolver" }] },
        1: { security: [{ card: "BT1-009", as: "securityDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-020");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("source").topCard?.cardId).toBe("BT25-020");
  });

  it("supports the public TS alternate evolution from a level 4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-011", as: "source" }], hand: [{ card: "BT25-054", as: "evolver" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-054");
    expect(s.state.memory).toBe(0);
  });

  it("supports both ordinary color routes at cost 4 and rejects the wrong color", async () => {
    for (const [source, as] of [
      ["BT1-069", "greenBase"],
      ["BT10-061", "blackBase"],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: source, as }], hand: [{ card: "BT25-054", as: "evolver" }] } });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("evolver").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === "BT25-054");
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "redBase" }], hand: [{ card: "BT25-054", as: "evolver" }] },
    });
    wrong.state.memory = 5;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("redBase").permanentId,
        instanceId: wrong.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("makes the chosen opponent Digimon attack at their next main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-054", as: "source" }],
          battleArea: [{ card: "BT1-009", as: "sink", suspended: true }],
          security: ["BT1-001"],
          deck: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-043", as: "target" }], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    const subscriptions = advance(s.engine).ledgers.subTriggers;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("target").permanentId).length === 1,
    );
    const sourceId = s.perm("source").permanentId;
    const sinkId = s.perm("sink").permanentId;
    expect(s.perm("target").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sinkId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("keeps Blocker, both entry grants, and the inherited battle-deletion watcher", () => {
    const card = runtimeCompiledCard("BT25-054");
    expect(
      card?.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(card?.effects.filter((effect) => effect.isInherited)).toMatchObject([
      { trigger: "AllTurns", frequency: "OncePerTurn" },
    ]);
    expect(
      card?.effects.some((effect) =>
        effect.actions?.some(
          (action) =>
            action.kind === "SubTrigger" &&
            action.event === "startOfYourMainPhase" &&
            action.duration === "untilOpponentTurnEnd" &&
            action.on?.filter?.controller === "opponent",
        ),
      ),
    ).toBe(true);
  });

  it("trashes security only when its host deletes in battle, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-068", as: "host", under: ["BT25-054"] },
          { card: "BT25-053", as: "otherWinner" },
        ],
      },
      1: { security: [{ card: "BT1-001", as: "topSecurity" }, "BT1-002"] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
      deletedPermanentIds: [s.perm("host").permanentId],
    });
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toContainEqual(s.inst("topSecurity"));

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("trashes security from the inherited clause after a public battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-068", as: "host", under: ["BT25-054"], dp: 12000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
        security: [{ card: "BT1-001", as: "topSecurity" }, "BT1-002"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
  });

  it("does not trigger the inherited clause when both battling Digimon are deleted (Q6337)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-068", as: "host", under: ["BT25-054"], dp: 12000 }] },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 12000 }],
        security: [{ card: "BT1-001", as: "topSecurity" }, "BT1-002"],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId),
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("keeps the forced-attack grant through the controller's turn and expires at their turn end", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-054", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const subscriptions = advance(s.engine).ledgers.subTriggers;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("target").permanentId).length === 1,
    );

    expect(subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
    subscriptions.sweepExpired(0);
    expect(subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
    subscriptions.sweepExpired(1);
    expect(subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(0);
  });
});

describe("BT25-054 GreatGrizzlymon — KB Q&A rulings", () => {
  /**
   * GreatGrizzlymon attacks and beats `loser`, then digivolves into Callismon from the hand.
   * Callismon offers a second battle on entry; `declinePrompts` can refuse it to keep the loser.
   */
  async function winBattleAgainst(loser: PermanentSpec, declinePrompts: string[] = []) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-054", as: "winner", dp: 12000 }],
          hand: [{ card: "BT25-058", as: "callismon" }],
        },
        1: { battleArea: [{ ...loser, as: "loser", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("winner").topCard?.cardId === "BT25-058");
    return s;
  }

  const battleWinTrigger = (s: EngineSetup) =>
    s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-054" && !event.isInherited,
    );

  it("gives the attack effect to a Digimon unaffected by effects, but it doesn't trigger while unaffected (Q6331)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-054", as: "grizzly" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT25-060", as: "rebootmon", suspended: true }], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const subscriptions = advance(s.engine).ledgers.subTriggers;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grizzly").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => subscriptions.subscriptionsFor("startOfYourMainPhase", s.perm("rebootmon").permanentId).length === 1,
    );

    // Rebootmon's unsuspend reaction makes it unaffected by the opponent's Digimon effects before its Main opens.
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await drainMicrotasks();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("rebootmon"), "beAffected", "Digimon")).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("rebootmon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("triggers after the losing Digimon is deleted by the battle (Q6332)", async () => {
    const s = await winBattleAgainst({ card: "BT1-010" });

    const battleDeletion = s.events.findIndex((event) => event.kind === "cardsMoved" && event.battleDeletion === true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(battleDeletion).toBeGreaterThanOrEqual(0);
    expect(battleWinTrigger(s)).toBeGreaterThan(battleDeletion);
  });

  it("lets the turn player activate the battle-win digivolve before the loser's On Deletion (Q6334)", async () => {
    const s = await winBattleAgainst({ card: "BT1-035", under: ["BT1-030"], dp: 5000 });

    const loserOnDeletion = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT1-030",
    );
    expect(battleWinTrigger(s)).toBeGreaterThanOrEqual(0);
    expect(loserOnDeletion).toBeGreaterThan(battleWinTrigger(s));
  });

  it("resolves the loser's would-be-deleted effect before the battle-win digivolve (Q6335)", async () => {
    const s = await winBattleAgainst({ card: "BT10-074", under: ["BT10-073"] });

    const armorPurgeCost = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("loser").instanceId),
    );
    expect(armorPurgeCost).toBeGreaterThanOrEqual(0);
    expect(battleWinTrigger(s)).toBeGreaterThan(armorPurgeCost);
  });

  it("still digivolves on a battle win when an effect prevents the loser's deletion (Q6336)", async () => {
    const s = await winBattleAgainst({ card: "BT10-074", under: ["BT10-073"] }, ["Battle"]);

    expect(s.perm("winner").topCard?.cardId).toBe("BT25-058");
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("loser").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT10-074");
  });
});
