import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-038 JaegerDorulumon", () => {
  it("has the Xros Heart evolution route and only a DigiXros-scoped Dorulumon alias (Q3094)", async () => {
    expect(digivolutionRequirementsFor("BT19-038")).toContainEqual({
      level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: true,
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-038", as: "jaeger" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("jaeger"))).toEqual(["jaegerdorulumon"]);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s suspends one opponent and gives one opponent both lockouts",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT19-038", as: "jaeger" }] },
        1: { battleArea: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }] },
      }, { autoSelectCards: true });
      await s.ready();
      await advance(s.engine).fireForPermanent(timing, s.perm("jaeger"));
      expect([s.perm("first"), s.perm("second")].filter((p) => p.isSuspended)).toHaveLength(1);
      const locked = ["first", "second"].filter(
        (alias) => observe(s.engine).isRestricted(s.perm(alias), "cannotActivateWhenDigivolving"),
      );
      expect(locked).toHaveLength(1);
      expect(observe(s.engine).isRestricted(s.perm(locked[0]!), "unsuspend")).toBe(true);
      const unlocked = locked[0] === "first" ? "second" : "first";
      expect(observe(s.engine).isRestricted(s.perm(unlocked), "unsuspend")).toBe(false);
    },
  );

  it("suppresses all When Digivolving processing without consuming a shared attack use (Q5541-Q5545)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-038", as: "jaeger" }] },
      1: { battleArea: [{ card: "ST24-07", as: "shine" }] },
    }, { autoSelectCards: true, autoDeclineOptional: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("jaeger"));
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("shine"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it.each([["BT19-033", "hand"], ["BT10-019", "trash"]] as const)(
    "On Deletion may place a %s card from %s under a Tamer",
    async (sourceCard, zone) => {
      const s = setupEngine({ 0: {
        battleArea: [{ card: "BT19-038", as: "jaeger" }, { card: "BT19-083", as: "tamer" }],
        ...(zone === "trash" ? { trash: [{ card: sourceCard }] } : { hand: [{ card: sourceCard }] }),
      } }, { autoAcceptOptional: true, autoSelectCards: true });
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("jaeger").permanentId], "byEffect");
      await settle(() => s.perm("tamer").stack.some((card) => card.cardId === sourceCard));
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([sourceCard]);
    },
  );

  it("inherited Piercing applies only to an Xros Heart host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-038", as: "matching", under: ["BT19-038"] },
      { card: "BT19-015", as: "nonmatching", under: ["BT19-038"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("matching"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nonmatching"))).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("matching"))).toBe(false);
  });
});
