import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT25-054.js";

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

  it("supports the public TS alternate evolution from a level 4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-051", as: "source" }], hand: [{ card: "BT25-054", as: "evolver" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-054");
    expect(s.state.memory).toBe(0);
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
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sinkId));
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
          { card: "BT25-053", as: "host", under: ["BT25-054"] },
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
      0: { battleArea: [{ card: "BT25-053", as: "host", under: ["BT25-054"], dp: 12000 }] },
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
