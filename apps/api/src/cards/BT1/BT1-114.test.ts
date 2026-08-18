import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-114.js";

describe("BT1-114 MetalGreymon", () => {
  it("has Security Attack +2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-114", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(true);
  });

  it("loses 5 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-114", as: "attacker" }] },
      1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });

  it("gives its host +3000 DP during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-115", under: ["BT1-114"], as: "host", dp: 10000 }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(13000);
  });
});
