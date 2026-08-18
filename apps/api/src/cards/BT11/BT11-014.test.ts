import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-014.js";

describe("BT11-014 GrapLeomon", () => {
  it("has Raid while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-014", as: "grap" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("grap"), "Raid")).toBe(true);
  });

  it("trashes one opposing security card when its host's attack target is switched", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-014"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("does not trash security for another Digimon's target switch", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT1-064", as: "host", under: ["BT11-014"] },
        { card: "BT1-064", as: "other" },
      ] },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
