import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-040.js";

describe("BT18-040 Dynasmon", () => {
  it("has Raid and pays the exact security cost to give an opponent -6000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-040", as: "dynasmon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), "Raid")).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("dynasmon").topCard!);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
