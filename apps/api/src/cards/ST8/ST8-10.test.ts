import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-10.js";

describe("ST8-10 UlforceVeedramon", () => {
  it("returns an opposing level 4 or lower and trashes all of its sources when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-08", as: "base" }], hand: [{ card: "ST8-10", as: "ulforce" }] },
        1: { battleArea: [{ card: "ST8-05", as: "target", under: [{ card: "ST8-04", as: "source" }] }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("unsuspends once when attacking with 8 cards and may attack again", async () => {
    const s = setupEngine({
      0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-10", as: "ulforce" }] },
      1: { security: ["ST8-01", "ST8-01"] },
    });
    const attackerId = s.perm("ulforce").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.phase === Phase.Main && !s.perm("ulforce").isSuspended && !observe(s.engine).isAttacking(),
    );
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
  });
});
