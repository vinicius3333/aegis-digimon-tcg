import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-004.js";

describe("BT6-004 Pinamon", () => {
  it("draws when its host attacks an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-047", under: ["BT6-004"], as: "host" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-011", suspended: true, as: "target" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
