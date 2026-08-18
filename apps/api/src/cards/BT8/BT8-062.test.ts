import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-062.js";

describe("BT8-062 SkullKnightmon Cavalier Mode", () => {
  it("gains Jamming and Blocker through the opponent's next turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-058", as: "base" }], hand: [{ card: "BT8-062", as: "evolving" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-062"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });
});
