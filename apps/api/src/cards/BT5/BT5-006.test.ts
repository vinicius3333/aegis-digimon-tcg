import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-006.js";

describe("BT5-006 Gigimon", () => {
  it("gives its host +2000 DP when another own Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-048", as: "host", under: ["BT5-006"] }, { card: "BT1-009", as: "other" }, { card: "BT1-010", as: "second" }] } });
    const host = s.perm("host");
    const before = host.currentDP;
    await (s.engine as any).primitives.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle(() => host.currentDP === before + 2000);
    expect(host.currentDP).toBe(before + 2000);

    await (s.engine as any).primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(host.currentDP).toBe(before + 2000);
  });
});
