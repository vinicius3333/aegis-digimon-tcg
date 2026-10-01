import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-001.js";

describe("BT7-001 Kapurimon", () => {
  it("gives its host +1000 DP while you have a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT7-001"], as: "host" }, "BT1-085"] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("accepts a Tamer of any color but not an opponent's Tamer", async () => {
    const own = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT7-001"], as: "host" }, "BT1-086"] },
    });
    await own.ready();
    expect(own.perm("host").currentDP).toBe(own.perm("host").baseDP + 1000);

    const opponentOnly = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT7-001"], as: "host" }] },
      1: { battleArea: ["BT1-086"] },
    });
    await opponentOnly.ready();
    expect(opponentOnly.perm("host").currentDP).toBe(opponentOnly.perm("host").baseDP);
  });

  it("does not give its host +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT7-001"], as: "host" }, "BT1-086"] },
    });
    s.state.turnSeat = 1;

    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});

describe("BT7-001 Kapurimon — KB Q&A rulings", () => {
  it("gives +1000 DP with a Tamer of any color in play (Q1502)", async () => {
    const hostDPWith = async (tamers: string[]): Promise<number> => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-010", under: ["BT7-001"], as: "host" }, ...tamers] },
      });
      await s.ready();
      return s.perm("host").currentDP - s.perm("host").baseDP;
    };
    const redTai = "BT1-085";
    const blueMatt = "BT1-086";
    const yellowTK = "BT1-087";
    const greenIzzy = "BT1-088";

    expect(await hostDPWith([redTai])).toBe(1000);
    expect(await hostDPWith([blueMatt])).toBe(1000);
    expect(await hostDPWith([yellowTK])).toBe(1000);
    expect(await hostDPWith([greenIzzy])).toBe(1000);
    expect(await hostDPWith([])).toBe(0);
  });
});
