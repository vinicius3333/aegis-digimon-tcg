import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-016.js";

describe("BT18-016 Volcanomon", () => {
  it("has Blitz on digivolving and gains 2000 DP when attacking", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", keywords: [{ keyword: "Blitz" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd", target: { filter: { isSelfRef: true } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-016", as: "volcanomon" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("volcanomon"));
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("volcanomon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("volcanomon").currentDP === s.perm("volcanomon").baseDP + 2000);
    expect(s.perm("volcanomon").currentDP).toBe(s.perm("volcanomon").baseDP + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("volcanomon"), "Blitz")).toBe(true);
  });
});
