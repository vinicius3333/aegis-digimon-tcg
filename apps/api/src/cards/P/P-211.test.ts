import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-211.js";

describe("P-211 Monica Simmons", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("restricts one opposing Digimon from attacking players until the opponent's turn ends", () => {
    expect(runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });

  it("gains memory at natural Main start only with an opposing Digimon", async () => {
    const withOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-211", as: "monica" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "unselected" },
          ],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withOpponent.state.memory = 5;
    await withOpponent.ready();
    const withOpponentTurn = withOpponent.engine.runOneTurn();
    await advance(withOpponent.engine).waitForMainPhase(0);
    expect(withOpponent.state.memory).toBe(6);
    expect(withOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await withOpponentTurn;

    const withoutOpponent = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-211", as: "monica" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withoutOpponent.state.memory = 5;
    await withoutOpponent.ready();
    const withoutOpponentTurn = withoutOpponent.engine.runOneTurn();
    await advance(withoutOpponent.engine).waitForMainPhase(0);
    expect(withoutOpponent.state.memory).toBe(5);
    expect(withoutOpponent.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await withoutOpponentTurn;
  });

  it("plays for its printed cost and restricts exactly one opposing Digimon from attacking players", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-211", as: "monica" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "unselected" },
          ],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monica").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined && observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers"),
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 7, reason: "playCard" });
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("unselected"), "attackPlayers")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("unselected"), "attackPlayers")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
