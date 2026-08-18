import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-008.js";

describe("BT11-008 Bearmon", () => {
  it("gives only its own host +3000 DP when that host's attack target is switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-008"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before + 3000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);
  });

  it("does not trigger when another Digimon's attack target is switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-008"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });
});
