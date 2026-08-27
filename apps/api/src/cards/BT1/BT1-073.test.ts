import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-073.js";

describe("BT1-073 Kabuterimon", () => {
  it("gives +1000 DP for each suspended opposing Digimon during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
          { card: "BT1-085", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("gives no DP when every opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016" }, { card: "BT1-017" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("gives no DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not apply while Kabuterimon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-073", as: "kabuterimon", dp: 5000 }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("kabuterimon").currentDP).toBe(5000);
  });
});
