import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-026 Espimon", () => {
  it("gets +2000 DP during the opponent's turn while a Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-005", as: "host", under: [{ card: "RB1-026" }] },
          { card: "RB1-032", as: "hiro" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).runTurn(0);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("does not gain the bonus when no Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-026" }] }] } });
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("host").currentDP).toBe(1000);
  });
});
