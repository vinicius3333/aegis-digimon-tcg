import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-030.js";
import "./BT9-033.js";

describe("BT9-033 Pillomon", () => {
  it("prevents effect plays but permits a normal Digimon play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }], hand: [{ card: "BT10-019", as: "normalPlay" }] }, 1: { battleArea: [{ card: "BT9-033", as: "pillomon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("normalPlay").instanceId,
    })).toEqual({ ok: true });
  });
});
