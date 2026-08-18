import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-006.js";
import "./BT8-079.js";

describe("BT8-006 DemiMeramon", () => {
  it("draws once when an effect trashes cards from the deck", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-076", as: "base", under: ["BT8-006"] }],
      hand: [{ card: "BT8-079", as: "evolving" }],
      deck: ["BT8-033", "BT8-034", { card: "BT8-035", as: "drawn" }],
    } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
