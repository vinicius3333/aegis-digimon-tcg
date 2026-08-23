import { describe, expect, it } from "vitest";
import { compiled as agumonExpert } from "./BT1-011.js";
import { compiled as biyomon } from "./BT1-012.js";
import { compiled as greymon } from "./BT1-015.js";
import { compiled as birdramon } from "./BT1-017.js";
import { compiled as flarerizamon } from "./BT1-018.js";

describe("BT1-011 through BT1-018 IR coverage", () => {
  it("registers each pending module with complete IR", () => {
    for (const card of [agumonExpert, biyomon, greymon, birdramon, flarerizamon]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains the printed trigger and target contracts", () => {
    expect(agumonExpert.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Return", to: "hand" }] });
    expect(biyomon.effects[0]).toMatchObject({ trigger: "WhenBlocked", isInherited: true });
    expect(greymon.effects[0]).toMatchObject({ trigger: "YourTurn", isInherited: true });
    expect(birdramon.effects[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
    });
    expect(flarerizamon.effects[0]?.actions[0]?.condition).toMatchObject({ kind: "memoryAtLeast", value: 3 });
  });
});
