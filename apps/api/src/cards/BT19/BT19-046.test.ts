import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-046 Chamblemon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s suspends one opponent, then independently locks one Data Digimon",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT19-046", as: "chamble" }] },
        1: { battleArea: [{ card: "BT19-044", as: "nonData" }, { card: "BT19-037", as: "data" }] },
      }, { autoSelectCards: true });
      await s.ready();
      await advance(s.engine).fireForPermanent(timing, s.perm("chamble"));
      expect([s.perm("nonData"), s.perm("data")].filter((p) => p.isSuspended)).toHaveLength(1);
      expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("nonData"), "unsuspend")).toBe(false);
      await advance(s.engine).verb.suspend([s.perm("data").permanentId]);
      await advance(s.engine).verb.unsuspend([s.perm("data").permanentId]);
      expect(s.perm("data").isSuspended).toBe(true);
    },
  );

  it("keeps the Data lock through the owner's turn and expires at the opponent's turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030", "BT19-031"] },
      1: { battleArea: [{ card: "BT19-037", as: "data" }], deck: ["BT19-030", "BT19-031"] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("chamble"));
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(false);
  });
});
