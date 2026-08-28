import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-102.js";

describe("BT3-102 Code Cracking", () => {
  it("lets the opponent trash their top security card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-032"], hand: [{ card: "BT3-102", as: "option" }], deck: ["BT3-033"] },
        1: { security: [{ card: "BT3-034", as: "security" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("recovers 1 when the opponent declines to trash security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT3-032"],
          hand: [{ card: "BT3-102", as: "option" }],
          deck: [{ card: "BT3-033", as: "recovered" }],
        },
        1: { security: ["BT3-034"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("recovers 1 when the opponent has no security to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT3-032"],
          hand: [{ card: "BT3-102", as: "option" }],
          deck: [{ card: "BT3-033", as: "recovered" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
