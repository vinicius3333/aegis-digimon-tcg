import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-047.js";

describe("BT6-047 Morphomon", () => {
  it("adds Menoa and Eosmon from the top 5 on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-047", as: "morphomon" }],
          deck: [{ card: "BT6-092", as: "menoa" }, { card: "BT6-085", as: "eosmon" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("morphomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("menoa").instanceId, s.inst("eosmon").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
