import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-020.js";

describe("BT15-020", () => {
  it("grants one Digimon Blocker and draws with Matt Ishida", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "youHave" },
    });
  });
  it("draws once per turn when attacking", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    }));

  it("grants executable Blocker through the opponent's turn and draws with a Matt-named Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-020", as: "gabumon" },
            { card: "BT1-086", as: "matt" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("gabumon"));
    await settle(
      () => observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker") && s.state.players[0]!.hand.length === 1,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker")).toBe(true);
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    expect(observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker")).toBe(true);
    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 1);
    expect(observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker")).toBe(false);
  });

  it("still grants Blocker but does not draw without a Matt Ishida-named Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT15-020", as: "gabumon" },
            { card: "BT15-082", as: "sora" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("gabumon"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("reaches Gabumon through its legal blue level-2 evolution route", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-003", as: "base" },
          hand: [{ card: "BT15-020", as: "gabumon" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gabumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-020");

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack).toHaveLength(2);
  });

  it("resolves Start of Your Main Phase through public turn progression", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-020", as: "gabumon" },
            { card: "BT1-086", as: "matt" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-003"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = false;

    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).hasKeyword(s.perm("gabumon"), "Blocker")).toBe(false);
  });

  it("draws only once from two real attacks by a host carrying the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-020"] }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
