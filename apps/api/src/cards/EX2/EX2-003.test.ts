import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-003.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";

describe("EX2-003 Viximon", () => {
  it("draws once after its controller uses an Option with use cost 2 or more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "host", under: ["EX2-003"] }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-102", as: "option2" },
          ],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: { battleArea: ["EX2-014"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("does not draw when the used Option costs less than 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "host", under: ["EX2-003"] }],
          hand: [{ card: "BT4-104", as: "option" }],
          deck: [{ card: "BT1-001", as: "notDrawn" }],
          security: ["BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });
});
