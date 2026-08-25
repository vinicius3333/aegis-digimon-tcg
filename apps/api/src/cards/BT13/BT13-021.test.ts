import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-021.js";

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
      0: { battleArea: [{ card: "BT13-021", as: "gaomon" }], deck: ["BT1-001"] },
      1: { hand: ["BT1-001"], deck: ["BT1-002"] },
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

  it("draws for both players only once across two attack timings in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-021", as: "gaomon" }], deck: ["BT1-001", "BT1-002"] },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("gaomon"), {
      attackerPermanentId: s.perm("gaomon").permanentId,
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("gaomon"), {
      attackerPermanentId: s.perm("gaomon").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("gains 1000 DP as an inherited effect while the opponent has at least 8 cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-021"] }] },
      1: { hand: Array.from({ length: 8 }, () => "BT1-001") },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not gain inherited DP at 7 opposing hand cards and gains it immediately at 8", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-021"] }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-001") },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);

    s.give(1, Zone.Hand, "BT1-002");
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
