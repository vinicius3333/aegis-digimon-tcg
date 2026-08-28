import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST14-01.js";

describe("ST14-01 Yaamon", () => {
  it("mills 2 when its Wizard host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-010", as: "host", under: ["ST14-01"] }], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not mill twice from the inherited once-per-turn effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-010", as: "host", under: ["ST14-01"] }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not use a Wizard in the stack to qualify a non-Wizard host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST14-05", as: "host", under: ["ST14-01"] }], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
