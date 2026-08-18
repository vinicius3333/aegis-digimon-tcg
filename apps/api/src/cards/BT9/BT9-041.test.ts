import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-041.js";

describe("BT9-041 RizeGreymon (X Antibody)", () => {
  it("plays a red or yellow Tamer and gives -2000 DP per such Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-038", as: "base" }, "BT1-087"], hand: [{ card: "BT9-041", as: "evolving" }, { card: "BT1-085", as: "tamer" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-041"));
    expect(s.state.players[0]!.battleArea.some(permanent => permanent.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
