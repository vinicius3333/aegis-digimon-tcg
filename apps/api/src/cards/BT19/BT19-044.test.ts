import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-044 Terriermon", () => {
  it.each(["BT19-085", "BT19-077"])("gains 1 memory at Start of Your Main Phase with either support (%s)", async (support) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-044", as: "terrier" }, { card: support }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("terrier"));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory without Henry Wong or Calumon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-044", as: "terrier" }, { card: "BT19-081" }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("terrier"));
    expect(s.state.memory).toBe(0);
  });

  it("inherited When Attacking suspends exactly one opponent Digimon only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-049", as: "host", under: ["BT19-044"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect([s.perm("first"), s.perm("second")].filter((p) => p.isSuspended)).toHaveLength(1);
    const untouched = s.perm("first").isSuspended ? s.perm("second") : s.perm("first");
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(untouched.isSuspended).toBe(false);
  });
});
