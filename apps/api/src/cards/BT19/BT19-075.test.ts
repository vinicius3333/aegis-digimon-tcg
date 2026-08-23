import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-075.js";

describe("BT19-075 MoonMillenniummon", () => {
  it("trashes the opponent down to five cards and deletes one Tamer per two trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-075", as: "source" }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 5);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
