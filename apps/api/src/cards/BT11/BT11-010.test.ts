import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-010.js";

describe("BT11-010 Grizzlymon", () => {
  it("has Raid while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-010", as: "grizzly" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("grizzly"), "Raid")).toBe(true);
  });

  it("gives its host +3000 DP when that host's attack target is switched", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-010"] }] },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before + 3000);
  });

  it("does not boost its host for another Digimon's target switch", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT1-064", as: "host", under: ["BT11-010"] },
        { card: "BT1-064", as: "other" },
      ] },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });
});
