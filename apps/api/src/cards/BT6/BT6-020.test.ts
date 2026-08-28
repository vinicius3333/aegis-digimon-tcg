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
