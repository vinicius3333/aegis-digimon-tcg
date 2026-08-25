import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-041 Dynasmon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may trash top security to give the same friendly Digimon Blocker and +6000 DP",
    async (timing) => {
      const s = setupEngine({ 0: {
        battleArea: [{ card: "BT19-041", as: "dynas" }, { card: "BT19-020", as: "peer" }],
        security: ["BT19-030", "BT19-031"],
      } }, { autoAcceptOptional: true, autoSelectCards: true });
      await s.ready();
      await advance(s.engine).fireForPermanent(timing, s.perm("dynas"));
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031"]);
      const affected = ["dynas", "peer"].filter((alias) => s.perm(alias).currentDP > (alias === "dynas" ? 11000 : 5000));
      expect(affected).toHaveLength(1);
      expect(observe(s.engine).hasKeyword(s.perm(affected[0]!), "Blocker")).toBe(true);
      const untouched = affected[0] === "dynas" ? "peer" : "dynas";
      expect(observe(s.engine).hasKeyword(s.perm(untouched), "Blocker")).toBe(false);
    },
  );

  it("may decline the security cost and grants neither DP nor Blocker", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-041", as: "dynas" }], security: ["BT19-030"],
    } }, { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dynas"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
  });

  it.each([2, 3])("recovers on would-leave only at 2 or fewer security, then still leaves (%s)", async (count) => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-041", as: "dynas" }],
      security: Array.from({ length: count }, () => "BT19-030"), deck: ["BT19-031"],
    } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(count === 2 ? 3 : 3);
    expect(s.state.players[0]!.deck).toHaveLength(count === 2 ? 0 : 1);
  });

  it("can recover before Tapirmon's simultaneous prevention cost (Q3095)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
      security: ["BT19-030", "BT19-032"], deck: ["BT19-031"],
    } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
