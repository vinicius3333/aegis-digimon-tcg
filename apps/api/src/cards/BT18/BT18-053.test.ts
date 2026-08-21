import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-053.js";

describe("BT18-053 JetSilphymon", () => {
  it("suspends the exact opponent and prevents its unsuspension when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-048", as: "base" }], hand: [{ card: "BT18-053", as: "jetsilphymon" }] },
      1: {
        battleArea: [
          { card: "BT1-030", as: "opponentTarget" },
          { card: "BT1-030", as: "otherOpponent" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("jetsilphymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-053");
    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("base").topCard!);
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend"));

    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend")).toBe(true);
    expect(s.perm("otherOpponent").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("otherOpponent"), "unsuspend")).toBe(false);
  });
});
