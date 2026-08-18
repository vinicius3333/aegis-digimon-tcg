import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-06.js";

describe("ST6-06 Garurumon", () => {
  it("draws 1 then trashes 1 from hand when its host attacks", async () => {
    const s = setupEngine({ 0: { hand: ["ST6-04"], deck: ["ST6-03"], battleArea: [{ card: "ST6-08", as: "host", under: ["ST6-06"] }] }, 1: { security: ["ST6-01"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
