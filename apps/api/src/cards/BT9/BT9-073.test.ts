import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-073.js";

describe("BT9-073 Sangloupmon", () => {
  it("lets its host digivolve from trash into an Undead or Dark Animal when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-075", as: "host", under: ["BT9-073"] }], trash: [{ card: "BT9-077", as: "evolution" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("evolution").instanceId);
  });
});
