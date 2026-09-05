import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-001.js";

describe("EX7-001 DemiMeramon", () => {
  it("inherits +2000 DP while the opponent has one or fewer Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "opponentHas", countMax: 1 } },
      ],
    }));

  it("publicly grants +2000 DP with one opposing Digimon", async () => {
    const one = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-001"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await one.ready();

    expect(one.perm("host").currentDP).toBe(5000);
  });

  it("does not grant the inherited boost when the opponent has two Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-001"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstOpponent" },
          { card: "BT1-009", as: "secondOpponent" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(3000);
  });
});
