import { describe, expect, it } from "vitest";
import { compiled as hercules } from "./BT1-081.js";
import { compiled as granKuwagamon } from "./BT1-083.js";
import { compiled as tai } from "./BT1-085.js";
import { compiled as izzy } from "./BT1-088.js";
import { compiled as metalGreymon } from "./BT1-114.js";
import { compiled as veedramon } from "./BT1-115.js";

describe("BT1 late Digimon and Tamer IR coverage", () => {
  it("registers complete IR for the migrated cards", () => {
    for (const card of [hercules, granKuwagamon, tai, izzy, metalGreymon, veedramon]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves keywords, limits, durations, and Tamer gates", () => {
    expect(hercules.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
    expect(hercules.effects[1]).toMatchObject({ trigger: "EndOfAttack", frequency: "TwicePerTurn" });
    expect(granKuwagamon.effects[1]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 4000 });
    expect(tai.effects[0]?.actions[0]).toMatchObject({ kind: "SetMemory", value: 3 });
    expect(izzy.effects[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 1 });
    expect(metalGreymon.effects[0]).toMatchObject({ keywords: [{ keyword: "SecurityAttack", amount: 2 }] });
    expect(veedramon.effects[0]).toMatchObject({ frequency: "OncePerTurn" });
    expect(veedramon.effects[1]?.actions[0]?.condition).toMatchObject({ kind: "youHave" });
  });
});
