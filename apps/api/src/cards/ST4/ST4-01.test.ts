import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST4-01.js";

describe("ST4-01 Motimon", () => {
  it("gives its level 6 host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-12", under: ["ST4-01"], as: "host" }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
  });

  it("does not give the bonus to a level 5 host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-10", under: ["ST4-01"], as: "host" }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-12", under: ["ST4-01"], as: "host" }] } });
    await s.ready();
    s.state.turnPlayer = 1;
    expect(s.perm("host").currentDP).toBe(11000);
  });
});
