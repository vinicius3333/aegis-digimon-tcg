import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-096.js";

describe("BT6-096 Forbidden Trident", () => {
  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-096", as: "security", faceUp: true }] } });
    const instanceId = s.inst("security").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("gives one Digimon +2000 DP and the printed When Attacking bounce for the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-019", as: "attacker" }],
        hand: [{ card: "BT6-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "rookie" }], security: ["BT1-001"] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const rookieInstanceId = s.perm("rookie").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP === 4000);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === rookieInstanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
