import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-071.js";
import "./BT8-010.js";

describe("BT8-071 Psychemon", () => {
  it("prevents an opponent from reducing a Digimon's play cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-071", as: "psychemon" }] },
      1: { battleArea: ["BT8-008", "BT8-034"], hand: [{ card: "BT8-010", as: "aquilamon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
