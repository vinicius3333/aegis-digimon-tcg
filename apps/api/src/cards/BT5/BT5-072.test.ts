import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-072.js";

describe("BT5-072 Fake Agumon Expert", () => {
  it("returns a level 3 with a main On Deletion effect from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-072", as: "expert", under: ["BT5-006"] }],
          trash: [
            { card: "BT5-071", as: "target" },
            { card: "BT5-071", as: "otherTarget" },
            { card: "BT5-072", as: "sameName" },
          ],
        },
        1: { trash: [{ card: "BT5-071", as: "opponentTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const targetId = s.inst("target").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("expert").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("otherTarget").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sameName").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentTarget").instanceId)).toBe(
      true,
    );
  });

  it("does not return a level 3 whose On Deletion text is inherited", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-072", as: "expert" }], trash: [{ card: "BT1-030", as: "inheritedTarget" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const targetId = s.inst("inheritedTarget").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("expert").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(false);
  });

  it("may decline returning an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-072", as: "expert" }],
          trash: [{ card: "BT5-071", as: "target" }],
        },
      },
      { autoDeclineOptional: true },
    );
    const targetId = s.inst("target").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("expert").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(false);
  });
});
