import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-019.js";

describe("P-019 Myotismon", () => {
  it("grants inherited Retaliation that deletes the battle winner", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-069", as: "attacker", under: ["P-019"], dp: 1000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 5000 }] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: defenderId },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId)
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
