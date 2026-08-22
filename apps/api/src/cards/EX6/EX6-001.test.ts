import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-001.js";

describe("EX6-001 Sakuttomon", () => {
  it("exposes complete IR for the inherited Legend-Arms add-to-stack watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { traits: ["Legend-Arms"] },
    });
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
    expect(s.state.memory).toBe(1);
  });
});
