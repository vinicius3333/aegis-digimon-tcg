import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-003 Bosamon", () => {
  it("gives its host +1000 DP while the opponent has no unsuspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-003" }] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("does not give the inherited bonus while an opponent Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-003" }] }] },
      1: { battleArea: [{ card: "EX2-045", as: "opponent" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(1000);
  });
});
