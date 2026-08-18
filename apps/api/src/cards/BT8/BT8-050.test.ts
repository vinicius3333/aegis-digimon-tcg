import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-050.js";

describe("BT8-050 Exermon", () => {
  it("suspends one of your Digimon to suspend an opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-064", as: "base" }, { card: "BT1-065", as: "cost" }], hand: [{ card: "BT8-050", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("cost").permanentId, s.perm("target").permanentId);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("cost").isSuspended).toBe(true);
  });
});
