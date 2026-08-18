import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-036.js";

describe("BT2-036 Gatomon", () => {
  it("gives -4000 DP when its owner has a purple Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-036", as: "source" }], battleArea: [
      { card: "BT2-067", as: "purple", dp: 3000 },
    ] }, 1: { battleArea: [{ card: "BT1-074", as: "target", dp: 7000 }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("gets +3000 DP when one of its owner's other Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-036", as: "gatomon" }, { card: "BT2-067", as: "other" }] } });
    const baseDP = s.perm("gatomon").currentDP;
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    expect(s.perm("gatomon").currentDP).toBe(baseDP + 3000);
  });
});
