import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-117.js";

describe("P-117 Veemon", () => {
  it("reduces a Your Turn digivolution into a Free Digimon by 1 when a Tamer is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-117", as: "veemon" },
            { card: "P-124", as: "tamer" },
          ],
          hand: [{ card: "BT12-022", as: "freeTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("freeTarget").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("freeTarget").instanceId);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("freeTarget").instanceId);
    expect(s.state.memory).toBe(9);
    assertNoLoudGap(s);
  });

  it("draws through its inherited effect only when the host has two colors", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-017", as: "host", under: ["P-117"] }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
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
