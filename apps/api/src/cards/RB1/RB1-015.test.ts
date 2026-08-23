import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-015 Fumamon", () => {
  it("trashes up to three cards under a low-DP opponent and restricts attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-015", as: "fumamon" }] },
      1: {
        battleArea: [{ card: "EX2-045", as: "target", under: ["RB1-017", "BT1-009", "RB1-020"] }],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fumamon"));
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(true);
  });

  it("does not affect an opponent Digimon above Fumamon's DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-015", as: "fumamon" }] },
      1: { battleArea: [{ card: "RB1-024", as: "target", under: ["RB1-017"] }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fumamon"));

    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(false);
  });
});
