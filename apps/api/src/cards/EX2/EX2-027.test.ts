import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-027.js";

describe("EX2-027 Rapidmon", () => {
  it("suspends an opposing Digimon when digivolving with a green Tamer in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-061"], hand: [{ card: "EX2-027", as: "evolution" }] }, 1: { battleArea: [{ card: "EX2-014", as: "target" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolution").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
