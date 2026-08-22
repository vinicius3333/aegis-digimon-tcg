import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-085.js";

describe("BT24-085 Dan Yuki & Kanan Yuki", () => {
  it("gates both optional trailing clauses behind the single suspend cost and opponent-memory cap", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 4 } }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "Suspend", optional: true, abortOnDecline: true },
        { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false, optional: true, filter: { playCostLte: 0, playCostLteScaling: { unit: "memory", per: 1 } } },
        { kind: "Attack", optional: true, target: { filter: { kind: ["Digimon"] }, count: 1 } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
