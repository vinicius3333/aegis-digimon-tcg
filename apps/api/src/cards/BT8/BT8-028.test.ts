import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-028.js";

describe("BT8-028 CaptainHookmon", () => {
  it("draws and gains memory when the opponent plays a level 5 or higher Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-028", as: "captain" }], deck: [{ card: "BT8-033", as: "drawn" }] },
      1: { battleArea: ["BT8-073"], hand: [{ card: "BT8-078", as: "played" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
