import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-15.js";

describe("ST13-15 Direct Smasher", () => {
  it("waives its color requirement with Legend-Arms and deletes the highest-DP Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST13-09"], hand: [{ card: "ST13-15", as: "smasher" }] },
      1: { battleArea: [{ card: "BT1-009", as: "low", dp: 3000 }, { card: "BT1-010", as: "high", dp: 9000 }] },
    });
    const highId = s.perm("high").permanentId;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
