import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-12.js";

describe("ST3-12 T.K. Takaishi", () => {
  it("gives your Security Digimon +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST3-12", "ST3-12", { card: "ST3-07", as: "normal" }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(4000);
    expect(s.perm("normal").currentDP).toBe(6000);
  });

  it("does not boost Security Digimon during your own turn", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST3-12", { card: "ST3-07", as: "normal" }] } });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST3-12", as: "tk" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tk").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tk").instanceId)).toBe(true);
  });
});
