import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-090.js";
import "./BT8-042.js";

describe("BT8-090 Kari Kamiya", () => {
  it("suspends to gain 1 memory when a card is added to your security", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-090", as: "kari" }, { card: "BT1-051", as: "base" }],
      hand: [{ card: "BT8-042", as: "evolving" }],
      deck: [{ card: "BT8-034", as: "recovered" }, "BT8-035"],
      security: ["BT8-034", "BT8-035"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && s.perm("kari").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });
});
