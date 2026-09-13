import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-021.js";
import "../ST1/ST1-12.js";

describe("BT13-021 Gaomon", () => {
  it("draws for both players and scales inherited DP on the opponent hand", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Draw", controller: "opponent", amount: 1 },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        expect.objectContaining({
          kind: "Aura",
          effect: { kind: "modifyDP", amount: 1000 },
          while: expect.objectContaining({ kind: "zoneCount", zone: "hand", op: "gte", value: 8 }),
        }),
      ],
    });
  });

  it("draws one card for each player when it attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-021", as: "gaomon" }], deck: ["BT1-010"] },
      1: { hand: ["BT1-010"], deck: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gaomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[1]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(2);
  });

  it("draws for both players once per turn and resets on the next own attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-021", as: "host" }],
        deck: ["BT1-010", "BT1-009", "BT1-011", "BT1-012"],
      },
      1: {
        hand: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        deck: ["BT1-015", "BT1-010", "BT1-011", "BT1-012"],
        security: ["ST1-12", "ST1-12"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[1]!.hand.length === 9);
    const hostId = s.perm("host").topCard.instanceId;
    // Supplemental repeat dispatch checks the consumed budget; public attacks prove activation/reset.
    const ownHandAfterFirst = s.state.players[0]!.hand.length;
    const opponentHandAfterFirst = s.state.players[1]!.hand.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(ownHandAfterFirst);
    expect(s.state.players[1]!.hand).toHaveLength(opponentHandAfterFirst);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === ownHandAfterFirst + 2);
    expect(s.state.players[1]!.hand.length).toBe(opponentHandAfterFirst + 2);
    expect(s.perm("host").topCard.instanceId).toBe(hostId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("gains 1000 DP as an inherited effect while the opponent has at least 8 cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT13-021"] }] },
      1: { hand: Array.from({ length: 8 }, () => "BT1-010") },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not gain inherited DP at 7 opposing hand cards and gains it immediately at 8", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT13-021"] }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-010") },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);

    s.give(1, Zone.Hand, "BT1-009");
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
