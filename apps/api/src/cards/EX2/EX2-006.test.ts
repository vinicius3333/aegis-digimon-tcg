import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX2-006.js";

describe("EX2-006 Yaamon", () => {
  it("gives its host +2000 DP with 10 cards in its controller's trash", async () => {
    const trash = Array.from({ length: 10 }, () => "BT1-001");
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-006"] }], trash } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("does not boost its host with only 9 cards in its controller's trash", async () => {
    const trash = Array.from({ length: 9 }, () => "BT1-001");
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-006"] }], trash } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("does not grant the bonus during the opponent's turn", async () => {
    const trash = Array.from({ length: 10 }, () => "BT1-001");
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-006"] }], trash } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
