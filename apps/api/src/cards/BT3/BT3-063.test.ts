import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-063.js";

describe("BT3-063 Sukamon", () => {
  it("reveals 3 on deletion, plays a Chuumon, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-063", as: "sukamon" }],
          deck: [
            { card: "BT3-061", as: "chuumon" },
            { card: "BT1-010", as: "restOne" },
            { card: "BT1-011", as: "restTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const playedId = s.inst("chuumon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("sukamon").permanentId]);

    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === playedId),
    ).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });
});
