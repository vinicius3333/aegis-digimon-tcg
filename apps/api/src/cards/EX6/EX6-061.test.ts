import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-061.js";

describe("EX6-061 Leviamon", () => {
  it("watches the printed OR play source and returns bottom stack cards before its Then delete", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { or: expect.any(Array) },
      actions: [
        { kind: "ReturnTopDigivolutionCards", cardsPerTarget: 3, position: "bottom" },
        { kind: "Delete", condition: { kind: "boardCountCompare", op: "lte" } },
      ],
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      actions: [
        { kind: "PlaceUnder", target: { from: ["trash"] }, underFilter: { zone: "breeding" }, position: "bottom" },
      ],
    });
  });
  it("publicly reacts to an opposing Digimon play by trashing its optional cost card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-061", as: "levia" }], hand: [{ card: "BT1-010", as: "cost" }] }, 1: { hand: [{ card: "BT1-009", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId], 1, { payCost: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
  });
});
