import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-020.js";

describe("BT11-020 Gaomon", () => {
  it("adds both a Gaogamon Digimon and a blue Tamer when both are revealed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-020", as: "gaomon" }],
        deck: [
          { card: "BT11-025", as: "gaogamon" },
          { card: "BT11-090", as: "tamer" },
          { card: "BT1-001", as: "rest" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rest").instanceId));

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("gaogamon").instanceId);
    expect(handIds).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("rest").instanceId);
  });

  it("adds the one available category when only a blue Tamer is revealed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-020", as: "gaomon" }],
        deck: [
          { card: "BT11-090", as: "tamer" },
          { card: "BT1-001", as: "rest1" },
          { card: "BT1-001", as: "rest2" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
