import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-054.js";

describe("P-054 Seraphimon", () => {
  it("recovers after the normal digivolution draw when a Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-015", as: "base" }, { card: "BT1-089", as: "tamer" }], hand: [{ card: "P-054", as: "source" }], deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-010", as: "recovered" }], security: ["BT1-028"] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security.some((c) => c.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });

  it("does not recover on digivolution without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-015", as: "base" }], hand: [{ card: "P-054", as: "source" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-028"] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => false, 30);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("recovers on deletion without requiring a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-054", as: "source" }], deck: [{ card: "BT1-010", as: "recovered" }], security: ["BT1-028"] } }, { autoSelectCards: true });
    await (s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: string): Promise<number> } }).primitives.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security.some((c) => c.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });
});
