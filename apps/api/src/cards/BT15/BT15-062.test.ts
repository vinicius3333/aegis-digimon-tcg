import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-035.js";
import "../BT1/BT1-078.js";
import "../BT1/BT1-089.js";
import "../BT14/BT14-009.js";
import "./BT15-054.js";
import { compiled } from "./BT15-062.js";
import "./BT15-066.js";
import "./BT15-079.js";

describe("BT15-062", () => {
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("deletes the paid Digimon and plays the Dark Masters into an empty breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-055", as: "victim" },
            { card: "BT15-062", as: "gigadramon" },
          ],
          hand: [{ card: "BT15-066", as: "machinedramon" }],
        },
        1: { deck: ["BT15-055"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-066");
    await turn;

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-066");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT15-055");
  });
});

describe("BT15-062 Gigadramon — KB Q&A rulings", () => {
  const OPPONENT_FILLER = ["BT1-009", "BT1-013", "BT1-009"];

  function inBattleArea(s: EngineSetup, seat: Seat, instanceId: string): boolean {
    return s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
  }

  async function runSeatZeroTurn(s: EngineSetup): Promise<void> {
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  }

  it("adds the only level 6 or higher revealed card when just one is among the four (Q2545)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-062", as: "gigadramon" }],
          deck: [
            { card: "BT1-009", as: "levelThree" },
            { card: "BT15-066", as: "levelSix" },
            { card: "BT1-078", as: "levelFive" },
            { card: "BT1-013", as: "otherLevelThree" },
            { card: "BT1-064", as: "unrevealed" },
          ],
        },
        1: { deck: [...OPPONENT_FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === s.inst("unrevealed").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("levelSix").instanceId]);
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(deckIds).toHaveLength(4);
    expect(deckIds[0]).toBe(s.inst("unrevealed").instanceId);
    expect([...deckIds.slice(1)].sort()).toEqual(
      [s.inst("levelThree"), s.inst("levelFive"), s.inst("otherLevelThree")].map((card) => card.instanceId).sort(),
    );
  });

  it("does not activate the [On Play] of a Digimon it plays into the breeding area (Q2546)", async () => {
    const victimFirst: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT15-062", as: "gigadramon" },
          ],
          hand: [{ card: "BT15-079", as: "piedmon" }],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponentDigimon" }], deck: [...OPPONENT_FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: victimFirst },
    );
    victimFirst.push(s.inst("victim").instanceId);
    await s.ready();

    await runSeatZeroTurn(s);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("piedmon").instanceId);
    expect(inBattleArea(s, 1, s.inst("opponentDigimon").instanceId)).toBe(true);

    const control = setupEngine(
      {
        0: { hand: [{ card: "BT15-079", as: "piedmon" }] },
        1: { battleArea: [{ card: "BT1-013", as: "opponentDigimon" }], deck: [...OPPONENT_FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 11;
    await control.ready();
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("piedmon").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => control.state.players[1]!.battleArea.length === 0);
    expect(inBattleArea(control, 1, control.inst("opponentDigimon").instanceId)).toBe(false);
  });

  it("does not trigger 'when a Digimon is played' watchers for a Digimon it plays into breeding (Q2547)", async () => {
    const board = {
      1: { battleArea: [{ card: "BT15-054", as: "rosemon" }], deck: [...OPPONENT_FILLER] },
    };
    const victimFirst: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT15-062", as: "gigadramon" },
          ],
          hand: [{ card: "BT15-066", as: "machinedramon" }],
          deck: ["BT1-009", "BT1-013"],
        },
        ...board,
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: victimFirst },
    );
    victimFirst.push(s.inst("victim").instanceId);
    await s.ready();

    await runSeatZeroTurn(s);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("machinedramon").instanceId);
    expect(s.perm("gigadramon").isSuspended).toBe(false);
    expect(s.decisions.some((decision) => decision.seat === 1)).toBe(false);

    const control = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-062", as: "gigadramon" }], hand: [{ card: "BT1-009", as: "played" }] },
        ...board,
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 5;
    await control.ready();
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended));
    expect(control.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(true);
  });

  it("keeps a Digimon it played into breeding unable to attack after an effect moves it to the battle area (Q2548)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-035", as: "leomon" },
            { card: "BT15-062", as: "gigadramon" },
            { card: "BT1-089", as: "mimi" },
            { card: "BT1-078", as: "greenLevelFive" },
          ],
          hand: [
            { card: "BT15-066", as: "machinedramon" },
            { card: "BT1-064", as: "goblimon" },
            { card: "BT1-013", as: "muchomon" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-009"],
        },
        1: { deck: [...OPPONENT_FILLER], security: 3 },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        preferInstanceIds,
      },
    );
    preferInstanceIds.push(s.inst("leomon").instanceId);
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("muchomon").instanceId })).toEqual({
      ok: true,
    });

    // Muchomon crosses the gauge to 2 on the opponent's side; Leomon's [On Deletion] (paid as
    // Gigadramon's cost) brings it back to 0, so the turn continues into Main again.
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("machinedramon").instanceId);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(0);

    const mainEntries = JSON.parse(s.perm("mimi").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard!.instanceId,
        effectKey: mainEntries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => inBattleArea(s, 0, s.inst("machinedramon").instanceId));
    expect(s.state.players[0]!.breeding).toBeUndefined();

    const moved = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("machinedramon").instanceId,
    )!;
    expect(moved.isSuspended).toBe(false);
    expect(moved.enterFieldTurnCount).toBe(s.state.turnCount);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gigadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("cannot play the Dark Masters Digimon into breeding under a 'can't play Digimon by effects' lock (Q2549)", async () => {
    async function runEndOfTurnPlay(opponentBattleArea: string[]): Promise<EngineSetup> {
      const victimFirst: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-009", as: "victim" },
              { card: "BT15-062", as: "gigadramon" },
            ],
            hand: [{ card: "BT15-066", as: "machinedramon" }],
            deck: ["BT1-009", "BT1-013"],
          },
          1: { battleArea: opponentBattleArea.map((card) => ({ card })), deck: [...OPPONENT_FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: victimFirst },
      );
      victimFirst.push(s.inst("victim").instanceId);
      await s.ready();
      await runSeatZeroTurn(s);
      return s;
    }

    const locked = await runEndOfTurnPlay(["BT14-009"]);
    expect(locked.state.players[0]!.breeding).toBeUndefined();
    expect(locked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      locked.inst("machinedramon").instanceId,
    );

    const unlocked = await runEndOfTurnPlay(["BT1-013"]);
    expect(unlocked.state.players[0]!.breeding?.topCard?.instanceId).toBe(unlocked.inst("machinedramon").instanceId);
    expect(unlocked.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(
      unlocked.inst("machinedramon").instanceId,
    );
  });
});
