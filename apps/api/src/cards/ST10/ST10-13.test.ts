import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-13.js";

describe("ST10-13 Junomon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST10-13", as: "junomon" }] } }, { autoOrderTriggers: true });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("junomon"), "Retaliation")).toBe(true);
  });

  it("trashes the top 3 deck cards and returns a Digimon from trash when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST10-12", as: "base" }], hand: [{ card: "ST10-13", as: "junomon" }], deck: [{ card: "ST10-07", as: "returned" }, "ST10-14", "ST10-15"] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("junomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
