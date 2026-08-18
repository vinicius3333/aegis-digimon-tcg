import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-041.js";

describe("P-041 Guilmon", () => {
  it("draws 1 whenever it attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-041", as: "guilmon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
    });
    const drawnId = s.inst("drawn").instanceId;
    expect(s.engine.applyIntent(0, {
      type: "attack", attackerPermanentId: s.perm("guilmon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("draws 1 when attacking the player, not only an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-041", as: "guilmon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { security: ["BT1-101"] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("guilmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
