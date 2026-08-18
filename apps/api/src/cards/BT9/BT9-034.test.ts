import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-034.js";

describe("BT9-034 Salamon (X Antibody)", () => {
  it("adds the top security card to hand and recovers from the deck", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-034", as: "base" }], hand: [{ card: "BT9-034", as: "evolving" }], security: [{ card: "BT1-048", as: "oldSecurity" }], deck: ["BT1-049", { card: "BT1-050", as: "recovered" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-034"));
    expect(s.state.players[0]!.hand.some(card => card.instanceId === s.inst("oldSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
  });
});
