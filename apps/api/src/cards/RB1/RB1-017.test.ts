import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-017 Numemon", () => {
  it("reveals and adds Monzaemon or Numemon cards when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-017", as: "numemon" }], deck: ["RB1-018", "BT1-009", "BT1-014"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("numemon").permanentId], "byEffect");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-018")).toBe(true);
  });

  it("grants Blocker to an inherited Numemon or Monzaemon-named host on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-018", as: "host", under: [{ card: "RB1-017" }] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
