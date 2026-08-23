import { describe, expect, it } from "vitest";
import { compiled as gravityCrush } from "./BT1-090.js";
import { compiled as nuclearLaser } from "./BT1-092.js";
import { compiled as boringStorm } from "./BT1-097.js";
import { compiled as blastFire } from "./BT1-105.js";
import { compiled as polyphony } from "./BT1-106.js";

describe("BT1 option IR coverage", () => {
  it("registers complete IR and preserves main/security clauses", () => {
    for (const card of [gravityCrush, nuclearLaser, boringStorm, blastFire, polyphony]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
    expect(gravityCrush.effects[0]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: -2, at: "endOfTurn" });
    expect(nuclearLaser.effects[0]?.actions).toMatchObject([
      { kind: "Draw", amount: 2 },
      { kind: "ModifyDP", amount: 2000 },
    ]);
    expect(boringStorm.effects).toMatchObject([{ trigger: "Main" }, { trigger: "Security" }]);
    expect(blastFire.effects[0]?.actions[0]).toMatchObject({
      kind: "SetBaseDP",
      value: 3000,
      duration: "untilOpponentTurnEnd",
    });
    expect(polyphony.effects[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -7000, duration: "forTheTurn" });
  });
});
