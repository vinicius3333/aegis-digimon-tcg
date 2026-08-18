import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-006.js";

describe("BT6-006 Tsunomon", () => {
  it("draws once when one of your effects trashes a card in your hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-079", under: ["BT6-006"], as: "host" }], hand: [{ card: "BT1-010", as: "discard" }], deck: [{ card: "BT1-011", as: "drawn" }] },
    });
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
