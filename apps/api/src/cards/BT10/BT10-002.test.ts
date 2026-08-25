import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-002.js";

describe("BT10-002 Bebydomon", () => {
  it("draws once per turn when its host attacks while the opponent has 2 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-024", as: "host", under: ["BT10-002"] }], deck: ["BT1-001", "BT1-002"] },
      1: { battleArea: ["BT10-020", "BT10-021"] },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw when the opponent attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-024", as: "host", under: ["BT10-002"] }],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-003"],
      },
      1: {
        battleArea: [
          { card: "BT10-020", as: "attacker" },
          { card: "BT10-021", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not count an opposing Tamer toward the 2-Digimon threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-024", as: "host", under: ["BT10-002"] }], deck: ["BT1-001"] },
      1: { battleArea: ["BT10-020", "BT10-087"] },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("tracks once-per-turn usage independently for two inherited sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-024", as: "first", under: ["BT10-002"] },
          { card: "BT10-024", as: "second", under: ["BT10-002"] },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: ["BT10-020", "BT10-021"] },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("first"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("second"));

    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
