import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-117.js";

describe("P-117 Veemon", () => {
  it("draws through its inherited effect only when the host has two colors", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-017", as: "host", under: ["P-117"] }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { security: ["BT1-001"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
