import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-042.js";

describe("BT6-042 Babamon", () => {
  it("plays one Rosemon from hand on deletion without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-042", as: "babamon" }],
          hand: [{ card: "BT1-082", as: "rosemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("babamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-082"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-082")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("plays up to two yellow level 3 Digimon from hand on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-042", as: "babamon" }],
          hand: [
            { card: "BT1-045", as: "first" },
            { card: "BT1-046", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("babamon").permanentId], "byEffect");
    await settle(
      () => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId.startsWith("BT1-04")).length === 2,
    );

    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId.startsWith("BT1-04"))).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
