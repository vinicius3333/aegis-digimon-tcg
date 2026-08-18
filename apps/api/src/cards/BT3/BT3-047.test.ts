import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-047.js";

describe("BT3-047 Wormmon", () => {
  it("reveals 3 on deletion, adds a level 4 Digimon, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-047", as: "wormmon" }],
          deck: [
            { card: "BT1-019", as: "levelFour" },
            { card: "BT1-010", as: "restOne" },
            { card: "BT1-011", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const addedId = s.inst("levelFour").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("wormmon").permanentId]);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === addedId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });
});
