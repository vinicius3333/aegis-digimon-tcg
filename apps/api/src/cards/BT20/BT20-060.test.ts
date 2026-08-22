import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-060.js";

describe("BT20-060 Alphamon: Ouryuken", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDNADigivolve" }] });
  });

  it("reduces one opposing Digimon by 15000 and, only on DNA digivolving, trashes the top security card and recovers one", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -15000, duration: "untilOpponentTurnEnd" });
      expect(actions[1]).toMatchObject({ kind: "Trash", condition: { kind: "isDnaDigivolving" }, target: { filter: { controller: "opponent", zone: "security" }, count: 1, fromTop: true } });
      expect(actions[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 }, condition: { kind: "isDnaDigivolving" } });
    }
  });

  it("gains 3 memory once per turn when security is removed", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 3 }] }] });
  });
});
