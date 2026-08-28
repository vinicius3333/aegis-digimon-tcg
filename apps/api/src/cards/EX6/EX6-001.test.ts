import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-001.js";

describe("EX6-001 Sakuttomon", () => {
  it("registers an inherited continuous Legend-Arms add-to-stack watcher", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("onAddDigivolutionCards");
    expect(text).toContain("byEffect");
    expect(text).toContain("Legend-Arms");
    expect(text).toContain("OncePerTurn");
  });

  it("gains memory only when the newly placed card is Legend-Arms", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-001", "EX6-007"] }],
        hand: [
          { card: "BT1-010", as: "nonLegendArms" },
          { card: "EX6-007", as: "legendArms" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("nonLegendArms").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("legendArms").instanceId]);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("legendArms").instanceId],
      byEffectSeat: 0,
    });
    expect(s.state.memory).toBe(1);
  });
});
