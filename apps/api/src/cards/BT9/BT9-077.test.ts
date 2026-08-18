import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-077.js";

describe("BT9-077 Matadormon", () => {
  it("may trash an Undead or Dark Animal card when attacking to get +3000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-077", as: "matadormon" }], hand: [{ card: "BT9-073", as: "cost" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("matadormon"));
    expect(s.perm("matadormon").currentDP).toBe(10000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
