import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-003.js";

describe("BT12-003 Koromon", () => {
  it("gives -1000 DP when a red Tamer becomes suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-034", under: ["BT12-003"] }, { card: "BT12-089", as: "tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("target").currentDP;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.perm("target").currentDP === before - 1000);
    expect(s.perm("target").currentDP).toBe(before - 1000);
  });

  it("ignores a black Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-034", under: ["BT12-003"] }, { card: "BT12-094", as: "tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("target").currentDP;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("target").currentDP).toBe(before);
  });
});
