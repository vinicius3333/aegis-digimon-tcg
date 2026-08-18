import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-027.js";

describe("BT11-027 Veedramon", () => {
  it("draws when its controller plays a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "veedramon" }],
        hand: [{ card: "BT11-090", as: "blueTamer" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when a non-blue Tamer is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "veedramon" }],
        hand: [{ card: "BT1-085", as: "redTamer" }],
        deck: [{ card: "BT1-001", as: "notDrawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("redTamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("redTamer").instanceId));
    await Promise.resolve();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notDrawn").instanceId);
  });

  it("inherited effect gains 1 memory for the same blue Tamer play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-029", under: ["BT11-027"] }],
        hand: [{ card: "BT11-090", as: "blueTamer" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);

    expect(s.state.memory).toBe(7);
  });
});
