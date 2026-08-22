import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-089.js";

describe("BT26-089 compiled fidelity", () => {
  it("separates check-driven and effect-driven security removal while sharing the placement cost", () => {
    const card = getCompiledCard("BT26-089");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watchers = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions ?? [];
    expect(watchers).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" } }),
      expect.objectContaining({ kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" } }),
    ]));
    expect(watchers[1]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend" }),
      expect.objectContaining({ kind: "PlaceUnder", fromDeckTop: true, faceDown: true }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }),
    ]));
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
