import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-005.js";

describe("BT7-005 Dorimon", () => {
  it("draws once when an effect places digivolution cards under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-061", under: ["BT7-005"], as: "host" }],
        hand: [{ card: "BT1-010", as: "placed" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("placed").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
  });
});
