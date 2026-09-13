import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-076.js";
import "./BT13-069.js";
import "./BT13-112.js";
import "../BT11/BT11-041.js";
import "../BT14/BT14-038.js";

describe("BT13-076 KingEtemon", () => {
  it("accepts legal level-5 Etemon and Sukamon evolution sources for four memory", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Etemon", "Sukamon"], cost: 4, isAlternate: true },
    ]);
    for (const source of ["BT14-038", "BT13-069"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: "BT13-076", as: "king" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      });
      await s.ready();
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("king").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("source").topCard.instanceId === s.inst("king").instanceId);
      await settle();
      expect(s.state.memory).toBe(6);
      expect(s.perm("source").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    }
  });

  it("debuffs one opposing Digimon when an Etemon or Sukamon is deleted", () => {
    const watcher = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    const trigger = watcher?.actions?.[0];
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
    });
    if (trigger?.kind !== "SubTrigger") throw new Error("Expected deletion SubTrigger action");
    expect(trigger.sourceFilter).toMatchObject({ nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] });
    expect(trigger.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"], excludeLeavingSubject: true }, count: 1 },
        amount: -3000,
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "GainKeyword",
        target: { filter: { controller: "opponent", kind: ["Digimon"], excludeLeavingSubject: true }, count: 1 },
        keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
        duration: "untilOpponentTurnEnd",
      },
    ]);
    expect(watcher).toMatchObject({ frequency: "OncePerTurn" });
  });

  it("grants Blocker and protects Etemon/Sukamon Digimon from returning", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
          },
          count: "all",
        },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "permanent",
      },
      {
        kind: "Restrict",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
          },
          count: "all",
        },
        restriction: "cannotReturnToHandOrDeck",
        duration: "permanent",
      },
    ]);
  });

  it("grants every matching own Digimon Blocker and return protection only during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-076", as: "king" },
          { card: "BT11-041", as: "etemon" },
          { card: "BT11-040", as: "sukamon" },
          { card: "BT11-042", as: "nonmatching" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    for (const alias of ["etemon", "sukamon"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
      // The compiled card keeps the printed restriction token, while the observer reads
      // the engine's normalized enforcement token.
      expect(observe(s.engine).isRestricted(s.perm(alias), "beReturned")).toBe(true);
    }
    expect(observe(s.engine).hasKeyword(s.perm("nonmatching"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nonmatching"), "beReturned")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    for (const alias of ["etemon", "sukamon"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm(alias), "beReturned")).toBe(false);
    }
  });

  it("debuffs after a public Etemon battle deletion once per turn and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-076", as: "king" },
            { card: "BT11-041", as: "first" },
            { card: "BT11-041", as: "second" },
            { card: "BT11-041", as: "third" },
          ],
          hand: ["BT1-009"],
          security: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT13-112", as: "target", suspended: true }],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    for (const alias of ["first", "second"]) {
      const attackerId = s.perm(alias).permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attackerId,
          target: { kind: "digimon", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));
      await settle();
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst(alias).instanceId);
      expect(s.perm("target").currentDP).toBe(11000);
      expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    }
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("target").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
    const thirdId = s.perm("third").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: thirdId,
        target: { kind: "digimon", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === thirdId));
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("third").instanceId);
    expect(s.perm("target").currentDP).toBe(11000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("also triggers when an opponent's Etemon is deleted (Q2314)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-076", as: "king" }] },
        1: {
          battleArea: [
            { card: "BT11-041", as: "etemon" },
            { card: "BT1-015", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("etemon").permanentId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
