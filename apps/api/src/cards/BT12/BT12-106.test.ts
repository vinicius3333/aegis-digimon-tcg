import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-106.js";
import "./BT12-045.js";
import "../BT10/BT10-018.js";
import "../BT19/BT19-022.js";

describe("BT12-106 compiled module", () => {
  it("registers its printed OnUseOption effect from declarative IR", () => {
    const module = getEffectModule("BT12-106");
    expect(module?.cardId).toBe("BT12-106");
    const source = {
      instanceId: "source-106",
      cardId: "BT12-106",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("registers its printed Security effect", () => {
    const module = getEffectModule("BT12-106");
    const source = { instanceId: "source-106", cardId: "BT12-106", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("keeps the Main unsuspend restriction live for later opponent entrants", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-106")!;
    const restriction = card.effects
      .find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "Restrict");
    expect(restriction).toMatchObject({
      kind: "Restrict",
      target: { count: "all", filter: { controller: "opponent" } },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      whileMatchesTargetFilter: true,
    });
  });

  it("Security suspends opposing cards without installing the Main restriction", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT12-106", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT12-091", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});

it("suspends opposing Digimon and Tamers with its Main effect", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-106", as: "option" }], battleArea: [{ card: "BT12-045", as: "green" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "digimon" },
          { card: "BT12-091", as: "tamer" },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended);
  expect(s.perm("digimon").isSuspended).toBe(true);
  expect(s.perm("tamer").isSuspended).toBe(true);
});

it("keeps a Digimon played after resolution suspended in the opponent's next unsuspend phase", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-106", as: "option" }], battleArea: [{ card: "BT12-045", as: "green" }] },
      1: {
        hand: [{ card: "BT1-009", as: "entrant" }],
        battleArea: [{ card: "BT1-009", as: "initial" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("initial").isSuspended);

  s.state.turnSeat = 1;
  s.state.memory = 10;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("entrant").instanceId })).toEqual({
    ok: true,
  });
  await settle(() =>
    s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("entrant").instanceId),
  );
  await advance(s.engine).verb.suspend([s.perm("entrant").permanentId]);
  const flipped = await (
    s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
  ).unsuspendForActivePhase(1);

  expect(s.perm("entrant").isSuspended).toBe(true);
  expect(flipped).not.toContain(s.perm("entrant").permanentId);
});

describe("BT12-106 Gypt Particle Cannon — KB Q&A rulings", () => {
  it("keeps a Digimon the opponent played suspended after the [Main] effect from unsuspending in their next unsuspend phase (Q2242)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-106", as: "option" }],
          battleArea: [
            { card: "BT12-045", as: "green" },
            { card: "BT1-009", as: "attacker", dp: 9000 },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          hand: [{ card: "BT19-022", as: "entrant" }],
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const entrantInstanceId = s.inst("entrant").instanceId;
    const entrantOnField = () =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === entrantInstanceId);

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gaossmon").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("gaossmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(entrantOnField);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("entrant").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("entrant").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("entrant").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await laterTurn;
  });
});
