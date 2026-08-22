import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("BT17-074 Eosmon — when digivolving play", () => {
  it("plays a white cost-4-or-less Tamer for 2 memory on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-044", as: "morphomon" }],
          hand: [{ card: "BT17-074", as: "eosmon" }, { card: "BT17-092", as: "tamer" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const morphomonId = s.perm("morphomon").permanentId;
    const eosmonId = s.inst("eosmon").instanceId;
    const tamerId = s.inst("tamer").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: eosmonId, permanentId: morphomonId }).ok).toBe(true);
    await settle(() => !s.state.players[0]?.hand.some((card) => card.instanceId === tamerId), 800);

    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.instanceId === tamerId)).toBe(true);
  });
});
