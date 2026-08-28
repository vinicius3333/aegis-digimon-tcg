import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-006.js";

describe("BT5-006 Gigimon", () => {
  it("gives its host +2000 DP when another own Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-048", as: "host", under: ["BT5-006"] },
          { card: "BT1-009", as: "other" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    const host = s.perm("host");
    const before = host.currentDP;
    await (s.engine as any).primitives.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle(() => host.currentDP === before + 2000);
    expect(host.currentDP).toBe(before + 2000);

    await (s.engine as any).primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(host.currentDP).toBe(before + 2000);

    await advance(s.engine).runTurn(0);
    expect(host.currentDP).toBe(before);
  });

  it("only watches other Digimon on its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-071", as: "host", under: ["BT5-006"] },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    const host = s.perm("host");
    const before = host.currentDP;

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    await (s.engine as any).primitives.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(host.currentDP).toBe(before);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    await (s.engine as any).primitives.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(host.currentDP).toBe(before);
  });

  it("Q1283 deletes its 0-DP host before the inherited effect can protect it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-048", as: "host", dp: 0, under: ["BT5-006"] },
          { card: "BT1-009", as: "other", dp: 0 },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId, s.perm("other").permanentId], "byRule");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("host").instanceId, s.inst("other").instanceId]),
    );
  });
});
