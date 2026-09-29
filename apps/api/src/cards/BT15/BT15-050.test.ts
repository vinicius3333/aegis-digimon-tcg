import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-035.js";
import "../BT1/BT1-089.js";
import "../BT9/BT9-033.js";
import "./BT15-031.js";
import { compiled } from "./BT15-050.js";
import "./BT15-054.js";

async function endTurnWithCherrymon(opponentBattleArea: PermanentSpec[]): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-009", as: "sacrifice" },
          { card: "BT15-050", as: "cherrymon" },
        ],
        hand: [{ card: "BT15-031", as: "metalSeadramon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: opponentBattleArea, deck: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
  );
  s.state.turnCount = 1;
  s.state.turnSeat = 0;
  await advance(s.engine).runTurn(0);
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

function mimiMainEffectKey(s: EngineSetup): string {
  const entries = JSON.parse(s.perm("mimi").activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(entries).toHaveLength(1);
  return entries[0]!.effectKey;
}

describe("BT15-050", () => {
  it("retains inherited Piercing", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding at end of turn", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    }));

  it("adds both level-6 hits from four revealed cards and bottoms both misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-050", as: "cherrymon" }],
          deck: [
            { card: "BT15-041", as: "hitOne" },
            { card: "BT15-042", as: "hitTwo" },
            { card: "BT15-025", as: "lowLevelMiss" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherrymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hitOne").instanceId, s.inst("hitTwo").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lowLevelMiss").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("adds the sole level-6 hit when only one is revealed, as clarified by Q2529", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-050", as: "cherrymon" }],
          deck: [{ card: "BT15-041", as: "onlyHit" }, "BT15-025", "BT1-009", "BT1-097"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherrymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("onlyHit").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("deletes one Digimon, plays a Dark Master into breeding without On Play, and preserves summoning sickness", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "sacrifice" },
            { card: "BT15-050", as: "cherrymon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT15-025", as: "onPlayTarget" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const onPlayTargetId = s.perm("onPlayTarget").permanentId;

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-031");

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-050")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === onPlayTargetId)).toBe(true);

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
    ).toMatchObject({
      ok: false,
    });
  });

  it("exposes inherited Piercing on a host carrying Cherrymon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-031", as: "host", under: ["BT15-050"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("digivolves legally from a green level-4 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-048", as: "base" }],
        hand: [{ card: "BT15-050", as: "cherrymon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherrymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-050");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });
});

describe("BT15-050 Cherrymon — KB Q&A rulings", () => {
  it("does not activate the [On Play] effect of a Digimon played into the breeding area (Q2530)", async () => {
    const s = await endTurnWithCherrymon([{ card: "BT15-025", as: "bounceTarget" }]);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-031");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT15-025"]);
    expect(s.state.players[1]!.hand).toHaveLength(0);

    const normalPlay = setupEngine(
      {
        0: { hand: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: { battleArea: [{ card: "BT15-025", as: "bounceTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    normalPlay.state.memory = 11;
    expect(
      normalPlay.engine.applyIntent(0, {
        type: "playCard",
        instanceId: normalPlay.inst("metalSeadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normalPlay.state.players[1]!.hand.length === 1);
    expect(normalPlay.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT15-025"]);
  });

  it("does not trigger 'when a Digimon is played' effects for a Digimon played into the breeding area (Q2531)", async () => {
    const s = await endTurnWithCherrymon([{ card: "BT15-054", as: "rosemon" }]);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-031");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT15-050"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(false);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT15-054")).toBe(false);

    const normalPlay = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-050", as: "cherrymon" }],
          hand: [{ card: "BT1-009", as: "played" }],
        },
        1: { battleArea: [{ card: "BT15-054", as: "rosemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    normalPlay.state.memory = 3;
    normalPlay.state.turnSeat = 0;
    expect(
      normalPlay.engine.applyIntent(0, { type: "playCard", instanceId: normalPlay.inst("played").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => normalPlay.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended));
    expect(normalPlay.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(true);
  });

  it("keeps a breeding-area Digimon unable to attack after an effect moves it to the battle area in a continued turn (Q2532)", async () => {
    const sacrificePreference: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT15-050", as: "cherrymon" },
            { card: "BT1-035", as: "memorySacrifice" },
          ],
          hand: [
            { card: "BT15-031", as: "metalSeadramon" },
            { card: "BT1-035", as: "memoryCrosser" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        declineDigiXros: true,
        preferInstanceIds: sacrificePreference,
      },
    );
    sacrificePreference.push(s.inst("memorySacrifice").instanceId);
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("memoryCrosser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-031" && s.state.memory >= 0);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard!.instanceId,
        effectKey: mimiMainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);

    const moved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-031");
    expect(moved).toBeDefined();
    await advance(s.engine).recompute();
    expect(moved!.summoningSick).toBe(true);
    expect(s.perm("cherrymon").summoningSick).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved!.permanentId, target: { kind: "player" } }),
    ).toMatchObject({ ok: false });

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    const raisedEarlier = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "mimi" },
            { card: "BT15-050", as: "cherrymon" },
          ],
          breeding: { card: "BT15-031", as: "raised" },
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    raisedEarlier.state.turnCount = 1;
    raisedEarlier.state.turnSeat = 0;
    const controlTurn = raisedEarlier.engine.runOneTurn();
    await settle(() => raisedEarlier.state.phase === Phase.Breeding);
    expect(raisedEarlier.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(raisedEarlier.engine).waitForMainPhase(0);
    expect(
      raisedEarlier.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: raisedEarlier.perm("mimi").topCard!.instanceId,
        effectKey: mimiMainEffectKey(raisedEarlier),
      }),
    ).toEqual({ ok: true });
    await settle(() => raisedEarlier.state.players[0]!.breeding === undefined);
    const raised = raisedEarlier.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT15-031",
    );
    expect(raised?.summoningSick).toBe(false);
    advance(raisedEarlier.engine).endMainPhaseIfOpen(0);
    await controlTurn;
  });

  it("cannot play a Digimon into the breeding area while a 'can't play Digimon by effects' effect applies (Q2533)", async () => {
    const locked = await endTurnWithCherrymon([{ card: "BT9-033", as: "pillomon" }]);

    expect(locked.state.players[0]!.breeding).toBeUndefined();
    expect(locked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      locked.inst("metalSeadramon").instanceId,
    );

    const unlocked = await endTurnWithCherrymon([{ card: "BT1-009" }]);
    expect(unlocked.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-031");
  });
});
