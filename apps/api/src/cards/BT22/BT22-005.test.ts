import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-005.js";

describe("BT22-005 Tsumemon", () => {
  it("draws once for either a CS or Unidentified Digimon played on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-053", under: ["BT22-005"], as: "host" },
          { card: "BT22-043", as: "cs" },
          { card: "BT17-053", as: "unidentified" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("cs").permanentId });
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("unidentified").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for a near-matching card, an opponent's card, or on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-053", under: ["BT22-005"], as: "host" },
          { card: "BT1-009", as: "nonmatch" },
          { card: "BT22-043", as: "wrongTurn" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT22-043", as: "opponentCs" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("nonmatch").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opponentCs").permanentId,
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("wrongTurn").permanentId,
    });

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
