import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-01.js";

describe("ST7-01 Gigimon", () => {
  it("gives its host +2000 DP once per turn when an opposing Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST7-08", as: "host", under: ["ST7-01"] },
          { card: "ST7-09", as: "attacker", dp: 9000 },
        ],
      },
      1: { battleArea: [{ card: "ST7-06", as: "target", dp: 5000, suspended: true }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("host").permanentId)).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("host").currentDP === 10000, 5000);
    expect(s.perm("host").currentDP).toBe(10000);
  });
});
