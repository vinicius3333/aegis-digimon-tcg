import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-085.js";

describe("BT8-085 Yolei Inoue", () => {
  it("suspends when a multicolor Digimon attacks to delete a 3000-DP-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-085", as: "yolei" },
            { card: "BT8-015", as: "attacker" },
          ],
        },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("yolei").isSuspended).toBe(true);
  });

  it("gains 1 memory at the start of its main phase when a red Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-085", as: "yolei" },
          { card: "BT8-013", as: "red" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yolei"));
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying memory", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT8-085", as: "securityYolei", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityYolei"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityYolei").instanceId,
      ),
    ).toBe(true);
  });
});
