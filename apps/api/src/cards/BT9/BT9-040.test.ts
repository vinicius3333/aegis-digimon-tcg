import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-040.js";

describe("BT9-040 Angewomon (X Antibody)", () => {
  it("gives Security Attack -1 and recovers with Angewomon in its sources at 5 or fewer security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-037", as: "base" }], hand: [{ card: "BT9-040", as: "evolving" }], deck: ["BT1-048", "BT1-049"] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-040"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
