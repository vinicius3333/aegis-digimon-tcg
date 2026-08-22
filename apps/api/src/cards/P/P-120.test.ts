import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-120.js";

describe("P-120 Gatomon", () => {
  it("uses Barrier to trash its security and survive a losing security battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-120", as: "gatomon" }], security: ["BT1-001"] }, 1: { security: ["BT1-020"] } });
    const id = s.perm("gatomon").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: id, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === id)).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies inherited -2000 DP to an opponent's security Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", dp: 5000, as: "host", under: ["P-120"] }] }, 1: { security: ["BT1-020"] } });
    const id = s.perm("host").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: id, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === id)).toBe(true);
    assertNoLoudGap(s);
  });
});
