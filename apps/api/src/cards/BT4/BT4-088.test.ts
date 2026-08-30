import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-088.js";

describe("BT4-088 DanDevimon", () => {
  it("once per opponent turn trashes their top security when one of yours is removed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-088", as: "dan", under: ["BT4-085"] }], security: ["BT1-001", "BT1-002"] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("makes the opponent trash 2 cards from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-088", as: "dan", under: ["BT4-085"] }] },
        1: { hand: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await (s.engine as any).primitives.deletePermanent([s.perm("dan").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});
