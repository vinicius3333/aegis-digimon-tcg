import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-002.js";
import { advance } from "../../engine/testkit/advance.js";

describe("BT9-002 whenEffectAddsToHand -> +1000 DP for the turn", () => {
  it("an effect-driven returnToHand fires the watcher and grants +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", dp: 5000, as: "host", under: [{ card: "BT9-002", as: "bt9002" }] }],
        trash: [{ card: "BT1-028", as: "trashedCard" }],
      },
    });

    const perm = s.perm("host");
    const baseline = perm.currentDP;
    const trashedInstanceId = s.inst("trashedCard").instanceId;

    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => perm.currentDP !== baseline, 40);

    expect(perm.currentDP).toBe(baseline + 1000);
  });

  it("does NOT fire for the OPPONENT's hand addition (seat-direction control)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", dp: 5000, as: "host", under: [{ card: "BT9-002", as: "bt9002" }] }],
      },
      1: {
        trash: [{ card: "BT1-028", as: "oppTrashedCard" }],
      },
    });

    const perm = s.perm("host");
    const baseline = perm.currentDP;
    const trashedInstanceId = s.inst("oppTrashedCard").instanceId;

    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    expect(perm.currentDP).toBe(baseline);
  });
});
