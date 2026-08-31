import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-097.js";

describe("BT4-097 Kari Kamiya", () => {
  it("may suspend to gain 1 memory when a card leaves own security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-097", as: "kari" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT4-076", as: "attacker" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kari").isSuspended && s.state.memory === -1);

    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT4-097", as: "securityTamer", faceUp: true }] } },
      { autoDeclineOptional: true },
    );
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
