import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST8-02.js";

describe("ST8-02 Gabumon", () => {
  it("gives its host +1000 DP on all turns while you have at least 8 cards in hand", async () => {
    const s = setupEngine({ 0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-10", as: "host", under: ["ST8-02"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(13000);
  });
});
