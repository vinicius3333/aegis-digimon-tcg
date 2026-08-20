import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-032.js";

describe("BT15-032", () => {
  it("returns an opposing Digimon with no more sources when digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", actions: [{ kind: "Return", to: "hand" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
  });
  it("gains 2 memory when an opponent attacks if Plesiomon/X Antibody is in the stack", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "GainMemory", amount: 2, condition: { kind: "selfHasInDigivolutionCards" } }] }] }));
});
