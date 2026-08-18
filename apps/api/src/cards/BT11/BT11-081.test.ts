import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-081.js";

describe("BT11-081 MadLeomon: Armed Mode", () => {
  it("on opponent turn trashes 1 source and draws 2 when an effect adds to opponent hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-081", as: "madleo", under: ["BT11-077"] }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("madleo").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
