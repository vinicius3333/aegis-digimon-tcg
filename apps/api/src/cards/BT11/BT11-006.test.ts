import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-006.js";

describe("BT11-006 Tsunomon", () => {
  it("gives its host +1000 DP when an effect trashes a card from its controller's hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 1);
    await settle(() => s.perm("host").currentDP === before + 1000);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("does not trigger outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 1;

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 1);

    expect(s.perm("host").currentDP).toBe(before);
  });
});
