import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-002.js";

describe("BT8-002 Hiyarimon", () => {
  it("gives its evolved host +1000 DP when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-002"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("gives its host +1000 DP while opposing Digimon have no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-002"] }] },
      1: { battleArea: ["BT8-034"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not grant DP when an opposing Digimon has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-002"] }] },
      1: { battleArea: [{ card: "BT8-034", under: ["BT8-003"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
