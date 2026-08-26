import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-052.js";
import "./BT12-049.js";
import "./BT12-054.js";

describe("BT12-054 Jagamon", () => {
  it("may play two Yakiimon cards from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-054", as: "jagamon" }],
          hand: [
            { card: "BT12-049", as: "yaki1" },
            { card: "BT12-049", as: "yaki2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("jagamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-049", "BT12-049"]);
  });

  it("plays Potamon but ignores non-matching cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-054", as: "jagamon" }],
          hand: [{ card: "BT12-052", as: "potamon" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("jagamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT12-052");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT1-009");
  });

  it("never plays more than two matching cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-054", as: "jagamon" }],
          hand: [
            { card: "BT12-049", as: "yaki1" },
            { card: "BT12-049", as: "yaki2" },
            { card: "BT12-052", as: "potamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("jagamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("may decline the optional play and leaves both matching cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-054", as: "jagamon" }],
          hand: [
            { card: "BT12-049", as: "yaki" },
            { card: "BT12-052", as: "potamon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const handIds = [s.inst("yaki").instanceId, s.inst("potamon").instanceId];
    await advance(s.engine).verb.deletePermanent([s.perm("jagamon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handIds);
  });
});
