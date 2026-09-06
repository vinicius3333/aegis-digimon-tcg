import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-050.js";
import "../BT1/BT1-036.js";
import "./index.js";

describe("BT20-050 HoverEspimon", () => {
  it("flips the next face-down opposing security card when digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }],
    });
  });

  it("draws once at end of attack and grants inherited +1000 DP", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("uses the Cyborg route for 2 and flips the next face-down security card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-046", as: "base" }], hand: [{ card: "BT20-050", as: "hover" }] },
      1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hover").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-050");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
  });

  it("keeps the ordinary black evolution route distinct from the Cyborg/Machine alternate", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT20-048", as: "base" }], hand: [{ card: "BT20-050", as: "hover" }] },
    });
    ordinary.state.memory = 3;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("base").permanentId,
        instanceId: ordinary.inst("hover").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => ordinary.perm("base").topCard.cardId === "BT20-050" && ordinary.state.pendingDecision === undefined,
    );
    expect(ordinary.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-007", as: "redBase" }], hand: [{ card: "BT20-050", as: "hover" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("hover").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("redBase").topCard.cardId).toBe("BT20-007");
  });

  it("draws exactly once across repeated end-of-attack windows in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-050", as: "hover" }],
        deck: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("hover"));
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("hover"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
  });

  it("draws once across two public attacks, then draws again after the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-050", as: "hover" }],
          hand: [
            { card: "BT1-036", as: "firstGarurumon" },
            { card: "BT1-036", as: "secondGarurumon" },
          ],
          security: Array.from({ length: 8 }, () => "BT9-109"),
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-010", as: "secondDraw" },
            { card: "BT1-011", as: "thirdDraw" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponentAttacker" }],
          security: Array.from({ length: 8 }, () => "BT9-109"),
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferred.push(s.perm("hover").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 1);
    expect(s.state.players[0]!.hand).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("hover").isSuspended);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("hover").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("grants its inherited host +1000 DP on both players' turns", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-052", dp: 7000, under: ["BT20-050"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
