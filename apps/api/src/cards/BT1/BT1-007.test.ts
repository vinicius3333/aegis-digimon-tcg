import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-007.js";

describe("BT1-007 Tanemon", () => {
  it("gives +1000 DP when attacking after its Digimon digivolved that turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-068", as: "base", dp: 3000, under: ["BT1-007"] }], hand: [{ card: "BT1-074", as: "evolving" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.to === "hand"));
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-007"));
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 1000);
  });
});
