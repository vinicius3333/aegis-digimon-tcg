import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-022.js";

describe("BT11-022 Dracomon", () => {
  it("draws once when another Blue Flare Digimon is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-022", as: "dracomon" }],
        hand: [{ card: "BT10-019", as: "qualifier" }],
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", { card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not trigger for a non-Dramon, non-Blue-Flare Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-022", as: "dracomon" }],
        hand: [{ card: "BT11-023", as: "nonQualifier" }],
        deck: [{ card: "BT1-001", as: "notDrawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonQualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("nonQualifier").instanceId),
    );
    await Promise.resolve();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notDrawn").instanceId);
  });

  it("inherited effect gains 1 memory for the same qualifying play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-025", as: "carrier", under: ["BT11-022"] }],
        hand: [{ card: "BT10-019", as: "qualifier" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);

    expect(s.state.memory).toBe(7);
  });
});
