import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-042.js";

describe("LM-042 Rasielmon", () => {
  it("suspends one opponent and restricts that same permanent from unsuspending or digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-042", as: "rasielmon" }] },
      1: { battleArea: [{ card: "BT1-055", as: "opponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rasielmon"));
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cantActivateWhenDigivolving")).toBe(true);
  });
});
