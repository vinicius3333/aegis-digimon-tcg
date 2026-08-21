import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-013.js";

describe("LM-013 Diarbbitmon", () => {
  it("plays through the public engine, suspends the last opposing Digimon, and gains 2 memory", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-013", as: "diarbbitmon" }] },
      1: { battleArea: [{ card: "ST1-08", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diarbbitmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });
});
