import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-084.js";

describe("BT15-084", () => {
  it("gives an opposing Digimon Security Attack -1 when directly trashed from security", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDiscardSecurity",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
    });
  });

  it("sets low memory, watches own effect-driven security removal, and plays from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [{ kind: "GainKeyword", cost: { kind: "suspend" } }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true });
  });
});
