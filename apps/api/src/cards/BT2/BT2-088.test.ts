import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-088.js";

describe("BT2-088 Taiga", () => {
  it("grants Piercing and may suspend to reduce a Tyrannomon digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-088", as: "taiga" }, { card: "BT2-043", as: "base" }],
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("tyrannomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044" && s.perm("taiga").isSuspended);
    await advance(s.engine).recompute();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-088", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });

  it("Q1038 does not reduce a Tyrannomon digivolution in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-088", as: "taiga" }],
        breeding: { card: "BT2-043", as: "base" },
        hand: [{ card: "BT2-044", as: "tyrannomon" }],
      },
    }, { autoAcceptOptional: true });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("tyrannomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });
});
