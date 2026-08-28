import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-007.js";
describe("BT12-007 Guilmon", () => {
  it("adds every Takato from the top four and bottoms the remainder", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-007", as: "guilmon" }],
        deck: ["BT12-089", "EX2-056", "BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT12-089", "EX2-056"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("does not boost a Guilmon host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-007", as: "host" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("boosts a Growlmon host by 2000 during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-010", as: "host", under: ["BT12-007"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("boosts a Gallantmon host but not during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-018", as: "host", under: ["BT12-007"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(14000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12000);
  });
});
