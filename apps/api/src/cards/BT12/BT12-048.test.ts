import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-048.js";

describe("BT12-048 Dracmon", () => {
  it("places up to three revealed Tamers from hand at deck bottom and draws that many", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-048", as: "dracmon" }],
          hand: [
            { card: "BT12-087", as: "tamer1" },
            { card: "BT12-087", as: "tamer2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
    await settle(() => s.state.players[0]!.hand.length === handBefore);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("tamer1").instanceId, s.inst("tamer2").instanceId]),
    );
  });
});
