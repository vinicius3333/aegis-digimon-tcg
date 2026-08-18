import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-028.js";

describe("BT2-028 AeroVeedramon", () => {
  it("unsuspends a blue Digimon with a blue Tamer in play", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086" }, { card: "BT2-024", as: "base" }, { card: "BT2-025", as: "target", suspended: true }], hand: [{ card: "BT2-028", as: "evolving" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("grants Jamming to its host when that Digimon becomes unsuspended in the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-030", as: "host", suspended: true, under: ["BT2-028"] }] } });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
