import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-036.js";

describe("BT7-036 Zephyrmon", () => {
  it("gives all of your Security Digimon +3000 DP through the opponent's next turn", async () => {
    const s = setupEngine({
      0: {
        // This is a legal frontier stack created by Kazemon's Tamer-onto route:
        // Zoe Orimoto -> L4 Hybrid Kazemon -> L4 Zephyrmon.
        battleArea: [{ card: "BT7-035", under: ["BT7-088"], as: "base" }],
        hand: [{ card: "BT7-036", as: "evolving" }],
        security: [{ card: "BT1-048", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-014", as: "attacker" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(0) === 3000);
    expect(observe(s.engine).securityDp(0)).toBe(3000);
    expect(s.perm("base").currentDP).toBe(6000);
  });
});
