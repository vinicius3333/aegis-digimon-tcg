import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-017.js";

describe("EX2-017 Leomon", () => {
  it("gains 2 memory and draws 1 when deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-017", as: "leomon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
        1: { battleArea: [{ card: "EX2-014", as: "defender", suspended: true }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 5 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
