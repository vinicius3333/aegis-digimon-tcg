import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-087.js";

describe("BT2-087 Kari Kamiya", () => {
  it("gains 1 memory at the start of its turn with 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-087", as: "kari" }], security: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kari"));

    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory with no security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-087", as: "kari" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kari"));

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory with 4 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-087", as: "kari" }],
        security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kari"));

    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-087", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
