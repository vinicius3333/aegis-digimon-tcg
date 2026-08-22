import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-072.js";

describe("BT5-072 Fake Agumon Expert", () => {
  it("returns a level 3 with a main On Deletion effect from trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-072", as: "expert" }], trash: [{ card: "BT5-071", as: "target" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const targetId = s.inst("target").instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("expert").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("does not return a level 3 whose On Deletion text is inherited", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-072", as: "expert" }], trash: [{ card: "BT1-030", as: "inheritedTarget" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const targetId = s.inst("inheritedTarget").instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("expert").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(false);
  });
});
