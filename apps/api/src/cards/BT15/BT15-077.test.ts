import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type BoardSpec,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-077.js";
import "../index.js";
import "../BT14/BT14-009.js";
import "../EX5/EX5-022.js";
import "./BT15-031.js";
import "../BT1/BT1-035.js";
import "../BT4/BT4-091.js";
import "../P/P-130.js";

describe("BT15-077", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { sourceRef: "battleOpponent" } }],
    }));
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding and unsuspends as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });

  it("adds the sole level-6 hit from four revealed cards and bottoms the misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-077", as: "ladyDevimon" }],
          deck: [
            { card: "BT15-041", as: "onlyHit" },
            { card: "BT15-025", as: "missOne" },
            { card: "BT1-009", as: "missTwo" },
            { card: "BT1-097", as: "missThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("onlyHit").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("onlyHit").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("missOne").instanceId,
        s.inst("missTwo").instanceId,
        s.inst("missThree").instanceId,
      ]),
    );
  });

  it("deletes one Digimon, plays a Dark Master into breeding, and preserves summoning sickness", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-068", as: "sacrifice" },
            { card: "BT15-077", as: "ladyDevimon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    const sacrificeId = s.perm("sacrifice").permanentId;

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-031");

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("sacrifice").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-031");

    s.state.phase = Phase.Breeding;
    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.state.players[0]!.breeding!.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    const moved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-031");
    expect(moved?.summoningSick).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved!.permanentId, target: { kind: "player" } }),
    ).toMatchObject({ ok: false });
  });

  it("deletes the battle opponent when its inherited LadyDevimon is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-080", as: "host", under: ["BT15-077"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });
});

describe("BT15-077 LadyDevimon — KB Q&A rulings", () => {
  function breedingPlayBoard(extra: { own?: BoardSpec[0]; opponent?: BoardSpec[1] } = {}): BoardSpec {
    return {
      0: {
        battleArea: [
          { card: "BT15-068", as: "sacrifice" },
          { card: "BT15-077", as: "ladyDevimon" },
          ...(extra.own?.battleArea ?? []),
        ],
        hand: [{ card: "BT15-031", as: "metalSeadramon" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"], ...extra.opponent },
    };
  }

  async function runTurnWithEndOfTurnPlay(board: BoardSpec) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(board, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declineDigiXros: true,
      preferInstanceIds,
    });
    preferInstanceIds.push(s.perm("sacrifice").topCard.instanceId);
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    await drainMicrotasks();
    return s;
  }

  function breedingCardId(s: EngineSetup) {
    return s.state.players[0]!.breeding?.topCard?.cardId;
  }

  it("adds the only level 6 or higher card when just one is revealed (Q2565)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-077", as: "ladyDevimon" }],
          deck: [
            { card: "BT15-025", as: "missOne" },
            { card: "BT15-041", as: "onlyHit" },
            { card: "BT1-009", as: "missTwo" },
            { card: "BT1-097", as: "missThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toEqual([s.inst("onlyHit").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("missOne").instanceId, s.inst("missTwo").instanceId, s.inst("missThree").instanceId].sort(),
    );
  });

  it("does not activate the [On Play] effect of a Digimon played into the breeding area (Q2566)", async () => {
    const s = await runTurnWithEndOfTurnPlay(
      breedingPlayBoard({ opponent: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] } }),
    );

    expect(breedingCardId(s)).toBe("BT15-031");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("opponentTarget").permanentId,
    );
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");

    const control = setupEngine(
      {
        0: { hand: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    control.state.memory = 10;
    expect(
      control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("metalSeadramon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(control.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not trigger 'when a Digimon is played' effects for a Digimon played into the breeding area (Q2567)", async () => {
    const opponentBoard: BoardSpec[1] = {
      battleArea: [{ card: "BT1-009", as: "opponentDigimon", under: [{ card: "BT1-010", as: "underCard" }] }],
    };
    const s = await runTurnWithEndOfTurnPlay(
      breedingPlayBoard({ own: { battleArea: [{ card: "EX5-022", as: "mihiramon" }] }, opponent: opponentBoard }),
    );

    expect(breedingCardId(s)).toBe("BT15-031");
    expect(s.perm("mihiramon")).toBeDefined();
    expect(s.perm("opponentDigimon").stack.map((card) => card.instanceId)).toEqual([s.inst("underCard").instanceId]);

    const control = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-022", as: "mihiramon" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: opponentBoard,
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    control.state.memory = 10;
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.perm("opponentDigimon").stack.length === 0);
  });

  it("cannot attack with a Digimon played into breeding and moved out after the turn continued (Q2568)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-091", as: "memorySacrifice" },
            { card: "BT15-077", as: "ladyDevimon" },
          ],
          hand: [
            { card: "BT1-035", as: "memoryCrosser" },
            { card: "BT15-031", as: "metalSeadramon" },
            { card: "P-130", as: "luiOhwada" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("memorySacrifice").topCard.instanceId);
    s.state.memory = 4;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const turnOfBreedingPlay = s.state.turnCount;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("memoryCrosser").instanceId })).toEqual({
      ok: true,
    });
    // Leomon crosses the memory to 1 on the opponent's side; Chaosmon's [On Deletion] (paid as
    // LadyDevimon's cost) brings it back to 2, so the turn continues past [End of Your Turn].
    await settle(() => breedingCardId(s) === "BT15-031" && s.state.memory === 2);
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    // Lui Ohwada's [On Play] moves the Digimon out of breeding; its own watcher regains 1 memory.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("luiOhwada").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.memory === 0);
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.turnCount).toBe(turnOfBreedingPlay);
    const moved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-031");
    expect(moved).toBeDefined();
    expect(moved!).toMatchObject({
      isSuspended: false,
      cannotAttack: false,
      summoningSick: true,
      enterFieldTurnCount: turnOfBreedingPlay,
    });
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved!.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ladyDevimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("cannot play a Digimon into the breeding area while players can't play Digimon by effects (Q2569)", async () => {
    const s = await runTurnWithEndOfTurnPlay(breedingPlayBoard({ opponent: { battleArea: ["BT14-009"] } }));

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("metalSeadramon").instanceId);

    const control = await runTurnWithEndOfTurnPlay(breedingPlayBoard());
    expect(breedingCardId(control)).toBe("BT15-031");
  });
});
