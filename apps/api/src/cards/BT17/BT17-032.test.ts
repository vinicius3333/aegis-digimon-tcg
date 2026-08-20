import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-032.js";

describe("BT17-032", () => {
  it("plays Rika Nonaka on digivolution if you do not already have one", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveNone" } }] });
  });

  it("has inherited cost 2+ option Security Attack -1", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }] }] });
  });
});
