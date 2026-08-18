import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-13.js";

describe("ST6-13 CresGarurumon", () => {
  it("has Security Attack +1 and Digi-Bursts 2 to play a purple level 3 from trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-13", as: "cres", under: [{ card: "ST6-03", as: "rookie" }, "ST6-06"] }] } }, { autoSelectCards: true });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("cres"), "SecurityAttack")).toBe(1);
    const entry = JSON.parse(s.perm("cres").activatableEffectsJson) as { instanceId: string; effectKey: string }[];
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: entry[0]!.instanceId, effectKey: entry[0]!.effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId));
    expect(s.perm("cres").stack).toHaveLength(0);
  });
});
