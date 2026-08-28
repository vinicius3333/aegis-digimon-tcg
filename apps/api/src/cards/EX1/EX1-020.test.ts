import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-020.js";

describe("EX1-020 Plesiomon", () => {
  it("can attack an opponent's unsuspended Digimon without digivolution cards on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.None, s.perm("plesiomon"));

    expect(observe(s.engine).canAttackUnsuspended(s.perm("plesiomon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesiomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("draws 2 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-020", as: "plesiomon" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", under: ["BT1-009"], as: "opponent" }] },
    });
    await s.ready();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).fire(EffectTiming.None, s.perm("plesiomon"));
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.perm("opponent").stack[0]!.instanceId],
      0,
    );

    expect(s.state.players[0]!.hand.length).toBe(before + 2);
  });
});
