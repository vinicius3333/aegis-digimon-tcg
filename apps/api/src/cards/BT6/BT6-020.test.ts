import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-020.js";

describe("BT6-020 Gizamon", () => {
  it("gives its host +2000 DP when the opponent has no Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-023", under: ["BT6-020"], as: "host" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("gives its host +2000 DP while the opponent has no Digimon with sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-023", under: ["BT6-020"], as: "host" }] },
      1: { battleArea: ["BT1-010"] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not give the bonus while an opposing Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-023", under: ["BT6-020"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-010", under: ["BT1-001"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});

describe("BT6-020 Gizamon — KB Q&A rulings", () => {
  it("activates its inherited +2000 DP when the opponent has no Digimon in the battle area (Q1414)", async () => {
    const emptyBoard = setupEngine({
      0: { battleArea: [{ card: "BT6-023", under: ["BT6-020"], as: "host" }] },
    });
    await emptyBoard.ready();
    expect(emptyBoard.state.players[1]!.battleArea).toHaveLength(0);
    expect(emptyBoard.perm("host").currentDP).toBe(emptyBoard.perm("host").baseDP + 2000);

    const opponentWithSources = setupEngine({
      0: { battleArea: [{ card: "BT6-023", under: ["BT6-020"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-010", under: ["BT1-001"] }] },
    });
    await opponentWithSources.ready();
    expect(opponentWithSources.perm("host").currentDP).toBe(opponentWithSources.perm("host").baseDP);
  });
});
