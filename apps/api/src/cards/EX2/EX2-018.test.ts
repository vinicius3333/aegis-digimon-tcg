import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-018.js";

describe("EX2-018 MarineAngemon", () => {
  it("recovers for opposing source-free Digimon without raising security above 5", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
        1: { battleArea: ["EX2-014", "EX2-019"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 5);
    expect(s.state.players[0]!.security).toHaveLength(5);
  });

  it("recovers only for source-free opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-003", "BT1-004", "BT1-005"],
        },
        1: { battleArea: ["EX2-014", { card: "EX2-014", as: "withSource", under: ["EX2-013"] }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
