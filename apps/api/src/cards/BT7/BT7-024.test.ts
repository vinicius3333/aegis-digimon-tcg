import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT7-024.js";

describe("BT7-024 — opponent Lv.3 can't attack while a [Hybrid] card is in this Digimon's stack", () => {
  it("draws once for each opposing Digimon without digivolution cards when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-024", as: "source" }], deck: ["BT1-001", "BT1-002", "BT1-003"] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "bare-a" },
          { card: "BT1-010", as: "bare-b" },
          { card: "BT1-011", under: ["BT1-001"], as: "stacked" },
        ],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("blocks the opponent Lv.3 attack with a [Hybrid] stack card, allows it once removed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-024", dp: 5000, as: "me", under: ["BT12-009"] }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "lv3" }] },
    });
    s.state.turnSeat = 1;

    const me = s.perm("me");
    const lv3 = s.perm("lv3");

    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(lv3.permanentId, "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: lv3.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    me.stack.splice(0, me.stack.length);
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(lv3.permanentId, "attack")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: lv3.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
