import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-006.js";

describe("BT3-006 DemiMeramon", () => {
  it("draws 1 then trashes 1 when its host is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-079", as: "host", under: ["BT3-006"] }], deck: [{ card: "BT1-010", as: "drawn" }] } }, { autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
