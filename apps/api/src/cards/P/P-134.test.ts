import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-134.js";

describe("P-134 Shoemon", () => {
  it("gives one opposing Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-134", as: "shoemon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({ ok: true });
    await settle(() => (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous.hasKeyword(s.perm("target").permanentId, "SecurityAttack"));
    expect((s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous.hasKeyword(s.perm("target").permanentId, "SecurityAttack")).toBe(true);
    assertNoLoudGap(s);
  });

  it("reduces one opposing Digimon by 2000 through the inherited attack effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-134"] }] }, 1: { battleArea: [{ card: "BT1-010", dp: 5000, suspended: true, as: "target" }] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});
