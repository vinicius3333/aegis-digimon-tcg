import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-042.js";

describe("BT8-042 Shakkoumon", () => {
  it("recovers at 5 security while keeping the second branch DNA-only", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-051", as: "base" }], hand: [{ card: "BT8-042", as: "evolving" }], deck: ["BT1-048", "BT1-049"], security: ["BT1-050", "BT1-051", "BT1-052", "BT1-053", "BT1-054"] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-042"));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
