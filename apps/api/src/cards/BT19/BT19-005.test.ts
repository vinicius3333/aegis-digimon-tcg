import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-005 Hopmon", () => {
  it("grants only its host Reboot on the opponent's turn while they have a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-056", as: "host", under: ["BT19-005"] }] },
      1: {
        battleArea: [
          { card: "BT1-028", as: "opponentDigimon" },
          { card: "BT19-080", as: "opponentTamer" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponentDigimon"), "Reboot")).toBe(false);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId]);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("opponentTamer").permanentId),
    ).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });
});
