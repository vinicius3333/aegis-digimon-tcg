import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-014.js";
import "../index.js";

describe("BT26-014 Darumamon", () => {
  it("compiles delete triggers and both On Deletion branches", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([["OnPlay", undefined], ["WhenDigivolving", undefined], ["OnDeletion", undefined], ["OnDeletion", true]]);
  });

  it("exposes the exact evolution and Assembly requirements", () => {
    expect(digivolutionRequirementsFor("BT26-014")).toContainEqual({ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true });
    expect(assemblyRequirementFor("BT26-014")).toEqual([{ reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] }]);
  });

  it("deletes an opposing Digimon at 7000 DP or less on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-014", as: "self" }] }, 1: { battleArea: [{ card: "BT26-012", as: "low", dp: 7000 }, { card: "BT26-013", as: "high", dp: 8000 }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-013");
  });
});
