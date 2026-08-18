import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-015.js";

describe("BT8-015 Silphymon", () => {
  it("gives -5000 DP but does not execute the DNA-only deletion after a normal digivolution", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "BT8-015", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target", dp: 9000 }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-015"));
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
