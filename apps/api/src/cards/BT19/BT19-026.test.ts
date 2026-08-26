import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-026 ZeigGreymon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s de-digivolves by 2 and bounces a level-4 when two opposing Digimon remain",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT19-026", as: "zeig" }] },
        1: { battleArea: [
          { card: "BT19-023", as: "stack", under: ["BT19-021", "BT19-019"] },
          { card: "BT19-020", as: "level4" },
        ] },
      }, { autoSelectCards: true });
      await advance(s.engine).fireForPermanent(timing, s.perm("zeig"));
      expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT19-021"]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-019", "BT19-023"].sort());
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT19-020")).toBe(true);
    },
  );

  it("does not bounce when de-digivolution exposes a Tamer and leaves only one opposing Digimon (Q3080)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-026", as: "zeig" }] },
      1: { battleArea: [
        { card: "BT19-023", as: "stack", under: ["BT19-081"] },
        { card: "BT19-020", as: "level4" },
      ] },
    }, { autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("zeig"));
    expect(s.perm("stack").topCard?.cardId).toBe("BT19-081");
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT19-020")).toBe(true);
  });

  it("counts a temporarily exposed Digi-Egg as the second Digimon before rule cleanup (Q3079)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-026", as: "zeig" }] },
      1: { battleArea: [
        { card: "BT19-023", as: "stack", under: ["BT19-001"] },
        { card: "BT19-020", as: "level4" },
      ] },
    }, { autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("zeig"));
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT19-023", "BT19-001"]));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("On Deletion plays an eligible Blue Flare from under a Tamer for free, then Saves", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-026", as: "zeig" },
      { card: "BT19-081", as: "tamer", under: ["BT19-020", "BT19-025"] },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("zeig").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-020"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025")).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-025", "BT19-026"]);
  });

  it("declining the optional source play still performs the independent Save", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-026", as: "zeig" },
      { card: "BT19-081", as: "tamer", under: ["BT19-020"] },
    ] } }, { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("zeig").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-020")).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020", "BT19-026"]);
  });

  it("inherited All Turns gives exactly +2000 DP to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-027", as: "host", under: ["BT19-026"] },
      { card: "BT19-027", as: "peer" },
    ] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(14000);
    expect(s.perm("peer").currentDP).toBe(12000);
  });
});
