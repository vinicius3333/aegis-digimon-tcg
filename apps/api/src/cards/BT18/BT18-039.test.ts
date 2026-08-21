import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-039.js";

describe("BT18-039 Mistymon", () => {
  it("has Barrier and changes an opponent's original DP after trashing exact security cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-039", as: "mistymon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-030", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mistymon"), "Barrier")).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("mistymon").topCard!);
    await s.ready();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").baseDP).toBe(3000);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});
