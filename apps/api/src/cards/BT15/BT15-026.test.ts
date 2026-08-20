import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-026.js";

describe("BT15-026", () => {
  it("draws and may trash a hand card when played or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", condition: { kind: "zoneCount", value: 5 } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }] });
  });
  it("once per turn restricts an opposing Digimon or Tamer from suspending", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] }));
});
