import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { compiled } from "./BT13-102.js";
import "./BT13-101.js";
import "./BT13-035.js";
import "../BT10/BT10-066.js";
import "../BT10/BT10-092.js";
import "../BT10/BT10-093.js";
import "../BT10/BT10-104.js";
import "../EX1/EX1-070.js";

describe("BT13-102 Keenan Crier", () => {
  it("offers the opponent a Tamer/Option hand trash, then rewards a decline", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      optional: true,
      target: { filter: { zone: "hand", controller: "opponent", kind: ["Tamer", "Option"] }, count: 1, upTo: true },
    });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentDeclinedTrash" } });
    expect(actions[2]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "opponentDeclinedTrash" },
    });
  });

  it("reacts to effect-played Digimon on the opponent's turn by suspending for memory", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { kind: ["Digimon"], byEffect: true },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("trashes an opposing Tamer through the optional hand choice", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-102", as: "keenan" }], deck: [{ card: "BT1-009", as: "drawn" }] },
        1: { hand: [{ card: "BT13-094", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("keenan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT13-094"));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-094");
  });

  it("gains memory and draws when the opponent declines the optional hand trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-102", as: "keenan" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { hand: [] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("keenan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("suspends for memory when the opponent effect-plays a Digimon, not for ordinary play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: { battleArea: [{ card: "BT13-101", as: "opponentTamer" }], hand: [{ card: "BT13-035", as: "pawn" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("opponentTamer"));
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));
    expect(s.perm("keenan").isSuspended).toBe(true);
  });

  it("reacts through a real opponent Tamer play that effect-plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: {
          hand: [
            { card: "BT13-101", as: "opponentTamer" },
            { card: "BT13-035", as: "pawn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));
    expect(s.perm("keenan").isSuspended).toBe(true);
  });

  it("does not react when the opponent ordinarily plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: { hand: [{ card: "BT13-035", as: "ordinary" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ordinary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));

    expect(s.perm("keenan").isSuspended).toBe(false);
  });
});

function memoryFor(s: EngineSetup, seat: 0 | 1): number {
  return new MemoryGauge(s.state).memoryFor(seat);
}

function hasInPlay(s: EngineSetup, seat: 0 | 1, cardId: string): boolean {
  return s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId);
}

describe("BT13-102 Keenan Crier — KB Q&A rulings", () => {
  it("gives the memory and draw to the player who played Keenan, not to the opponent who declined (Q2350)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-009", as: "notTamerOrOption" }], deck: [{ card: "BT1-015", as: "opponentTop" }] },
        1: { hand: [{ card: "BT13-102", as: "keenan" }], deck: [{ card: "BT1-030", as: "keenanOwnerTop" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const ownerMemoryBefore = memoryFor(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("keenan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-030"));

    expect(memoryFor(s, 1)).toBe(ownerMemoryBefore - 3 + 1);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-030"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-015"]);
  });

  it("triggers when an effect plays either the opponent's Digimon or Keenan's owner's Digimon (Q2351)", async () => {
    const opponentSide = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: {
          hand: [
            { card: "BT13-101", as: "opponentTamer" },
            { card: "BT13-035", as: "pawn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    opponentSide.state.turnSeat = 1;
    opponentSide.state.memory = 10;
    await opponentSide.ready();
    expect(
      opponentSide.engine.applyIntent(1, {
        type: "playCard",
        instanceId: opponentSide.inst("opponentTamer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => hasInPlay(opponentSide, 1, "BT13-035") && opponentSide.perm("keenan").isSuspended);
    expect(opponentSide.perm("keenan").isSuspended).toBe(true);

    const ownSide = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-102", as: "keenan" }],
          security: [{ card: "EX1-070", as: "securityOption" }],
          trash: [{ card: "BT11-075", as: "ownDigimon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "attacker" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ownSide.state.turnSeat = 1;
    ownSide.state.memory = 3;
    await ownSide.ready();
    const opponentTurn = ownSide.engine.runOneTurn();
    await advance(ownSide.engine).waitForMainPhase(1);
    const ownSideMemoryBefore = memoryFor(ownSide, 0);

    expect(
      ownSide.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: ownSide.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The attack continues toward turn end after Keenan resolves, so read memory at the milestone.
    let ownSideMemoryAfterTrigger: number | undefined;
    await settle(() => {
      const triggerResolved =
        hasInPlay(ownSide, 0, "BT11-075") &&
        ownSide.perm("keenan").isSuspended &&
        memoryFor(ownSide, 0) !== ownSideMemoryBefore;
      if (triggerResolved) ownSideMemoryAfterTrigger = memoryFor(ownSide, 0);
      return triggerResolved;
    });

    expect(hasInPlay(ownSide, 0, "BT11-075")).toBe(true);
    expect(ownSide.perm("keenan").isSuspended).toBe(true);
    expect(ownSideMemoryAfterTrigger).toBe(ownSideMemoryBefore + 1);
    advance(ownSide.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("ignores a DigiXros main-phase play but triggers on a DigiXros performed while an effect plays the Digimon (Q2352)", async () => {
    const mainPhaseXros = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: {
          hand: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    mainPhaseXros.state.turnSeat = 1;
    mainPhaseXros.state.memory = 10;
    await mainPhaseXros.ready();
    const materialIds = [
      mainPhaseXros.inst("skullKnightmon").instanceId,
      mainPhaseXros.inst("deadlyAxemon").instanceId,
    ];

    expect(
      mainPhaseXros.engine.applyIntent(1, {
        type: "playCard",
        instanceId: mainPhaseXros.inst("darkKnightmon").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => hasInPlay(mainPhaseXros, 1, "BT10-066") && mainPhaseXros.state.pendingDecision === undefined);
    await drainMicrotasks();

    const xrosPlayed = mainPhaseXros.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT10-066",
    )!;
    expect(xrosPlayed.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(materialIds));
    expect(mainPhaseXros.perm("keenan").isSuspended).toBe(false);
    expect(memoryFor(mainPhaseXros, 0)).toBe(-10 + 4);

    const effectXros = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: {
          battleArea: ["BT10-092", "BT10-093"],
          hand: [{ card: "BT10-104", as: "immortalRuler" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          trash: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    effectXros.state.turnSeat = 1;
    effectXros.state.memory = 10;
    await effectXros.ready();

    expect(
      effectXros.engine.applyIntent(1, { type: "playCard", instanceId: effectXros.inst("immortalRuler").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => hasInPlay(effectXros, 1, "BT10-066") && effectXros.perm("keenan").isSuspended);

    const effectPlayed = effectXros.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT10-066",
    )!;
    expect(effectPlayed.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT7-058", "BT7-059"]));
    expect(effectXros.perm("keenan").isSuspended).toBe(true);
  });
});
