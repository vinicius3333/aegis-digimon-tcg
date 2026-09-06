import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-053.js";
import "../index.js";

describe("BT21-053 Watchmon", () => {
  it("preserves the Appmon evolution and link requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("restricts one opponent Digimon from attacking players until opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");

    expect(effect?.actions).toEqual([
      {
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("applies the same restriction when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenLinking");
    expect(effect).toEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
          },
        ],
      }),
    );
  });

  it("restricts the selected opponent Digimon through the public On Play effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-053", as: "watchmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", as: "otherOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("watchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("otherOpponent"), "attackPlayers")).toBe(false);
  });

  it("blocks only player attacks while still allowing the affected Digimon to attack a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-053", as: "watchmon" }],
          battleArea: [{ card: "BT1-010", as: "defender", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("watchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));
    expect(observe(s.engine).isRestricted(s.perm("defender"), "attackPlayers")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("links for 1, grants 2000 DP, and applies the same attack restriction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT21-053", as: "watchmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 2;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("watchmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
  });

  it("expires the public On Play restriction when the opponent's turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-053", as: "watchmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("watchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(false);
  });

  it("zero-cost digivolves from a level-2 Appmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-005", as: "appmonEgg" }],
        hand: [{ card: "BT21-053", as: "watchmon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("appmonEgg").permanentId,
        instanceId: s.inst("watchmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonEgg").topCard.instanceId === s.inst("watchmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
