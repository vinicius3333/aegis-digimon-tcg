import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-023.js";

describe("BT11-023 Veemon", () => {
  it("adds both a Veedramon Digimon and blue Tamer when both are revealed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-023", as: "veemon" }],
        deck: [
          { card: "BT11-027", as: "veedramon" },
          { card: "BT11-090", as: "tamer" },
          { card: "BT1-001", as: "rest" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("veedramon").instanceId);
    expect(handIds).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("rest").instanceId);
  });

  it("adds the one available category when only a blue Tamer is revealed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-023", as: "veemon" }],
        deck: [
          { card: "BT11-090", as: "tamer" },
          { card: "BT1-001", as: "rest1" },
          { card: "BT1-001", as: "rest2" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("inherited effect gains memory only when its controller plays a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", under: ["BT11-023"] }],
        hand: [{ card: "BT11-090", as: "blueTamer" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);

    expect(s.state.memory).toBe(7);
  });
});
