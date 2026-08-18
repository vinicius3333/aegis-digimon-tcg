import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-003.js";

describe("BT10-003 Pickmons", () => {
  it("draws when its Xros Heart host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-003"] }], deck: ["BT1-001"] } });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw for a host without the Xros Heart trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-020", as: "host", under: ["BT10-003"] }],
        deck: ["BT1-001"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw when the opponent attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-003"] }],
        deck: ["BT1-001"],
        security: ["BT1-003"],
      },
      1: { battleArea: [{ card: "BT10-020", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
