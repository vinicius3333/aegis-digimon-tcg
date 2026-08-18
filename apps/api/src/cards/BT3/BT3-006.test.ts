import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-006.js";

describe("BT3-006 DemiMeramon", () => {
  it("draws 1 then trashes 1 when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-079", as: "host", under: ["BT3-006"] }],
          hand: [{ card: "BT1-011", as: "keep" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(handIds.includes(s.inst("keep").instanceId) || handIds.includes(s.inst("drawn").instanceId)).toBe(true);
    expect(trashIds.includes(s.inst("keep").instanceId) || trashIds.includes(s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
