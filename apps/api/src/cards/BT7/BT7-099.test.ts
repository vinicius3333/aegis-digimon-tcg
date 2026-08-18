import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-099.js";

describe("BT7-099 Electric Rush", () => {
  it("gives +3000 DP and unsuspends a Digimon when you have exactly 3 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-031", as: "target", suspended: true }],
        security: ["BT7-032", "BT7-032", "BT7-032"],
        hand: [{ card: "BT7-099", as: "option" }],
      },
    }, { autoSelectCards: true });
    const startingDp = s.perm("target").currentDP;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended && s.perm("target").currentDP === startingDp + 3000);

    expect(s.perm("target").currentDP).toBe(startingDp + 3000);
  });

  it.each([2, 4])("does not unsuspend with %i security cards", async (securityCount) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-031", as: "target", suspended: true }],
        security: Array.from({ length: securityCount }, () => "BT7-032"),
        hand: [{ card: "BT7-099", as: "option" }],
      },
    }, { autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
