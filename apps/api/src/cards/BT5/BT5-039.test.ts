import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-039.js";

describe("BT5-039 ShootingStarmon", () => {
  it("gives an opposing Digimon -3000 DP when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-039", as: "shooting" }] },
        1: {
          battleArea: [
            { card: "BT4-073", as: "target" },
            { card: "BT4-073", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    const before = target.currentDP;
    await (s.engine as any).primitives.deletePermanent([s.perm("shooting").permanentId], "byEffect");
    await settle(() => target.currentDP === before - 3000);
    expect(target.currentDP).toBe(before - 3000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);
  });
});
