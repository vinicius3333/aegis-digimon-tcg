import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-072.js";
import "./BT2-030.js";

describe("BT2-030 MetalSeadramon", () => {
  it("returns up to two opposing level 4 or lower Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-030", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "levelFourA", dp: 4000, under: [{ card: "BT1-001", as: "sourceA" }] },
            { card: "BT1-036", as: "levelFourB", dp: 5000, under: [{ card: "BT1-003", as: "sourceB" }] },
            { card: "BT1-074", as: "levelFive", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.hand.length === 2);
    expect(opponent.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-070", "BT1-036"]));
    expect(opponent.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sourceA").instanceId, s.inst("sourceB").instanceId]),
    );
    expect(opponent.battleArea[0]?.topCard?.cardId).toBe("BT1-074");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT2-030");
  });

  it("Q1006 rejects a source-less Blocker while a sourced Blocker remains legal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-030", as: "attacker", dp: 20_000 }] },
      1: {
        battleArea: [
          { card: "BT1-072", as: "sourceLess" },
          { card: "BT1-072", as: "sourced", under: ["BT1-064"] },
        ],
        security: ["BT1-010"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("sourceLess").permanentId }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("sourced").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("sourceLess").isSuspended).toBe(false);
  });

  it("skips the blocker window when every opposing Blocker is source-less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-030", as: "attacker", dp: 20_000 }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-010", "BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 1000);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });
});
