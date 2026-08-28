import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-030 Renamon", () => {
  it.each(["BT19-083", "BT19-077"])(
    "gains 1 memory at the start of its main phase with Rika or Calumon (%s)",
    async (supportCard) => {
      const s = setupEngine({ 0: { battleArea: [
        { card: "BT19-030", as: "rena" }, { card: supportCard, as: "support" },
      ] } });
      s.state.memory = 0;
      await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("rena"));
      expect(s.state.memory).toBe(1);
    },
  );

  it("gains no start-main memory without Rika or Calumon or on the opponent's turn", async () => {
    const missing = setupEngine({ 0: { battleArea: [{ card: "BT19-030", as: "rena" }] } });
    await advance(missing.engine).fireForPermanent(EffectTiming.OnStartMainPhase, missing.perm("rena"));
    expect(missing.state.memory).toBe(0);

    const opponentTurn = setupEngine({ 0: { battleArea: [
      { card: "BT19-030", as: "rena" }, { card: "BT19-083" },
    ] } });
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).fireForPermanent(EffectTiming.OnStartMainPhase, opponentTurn.perm("rena"));
    expect(opponentTurn.state.memory).toBe(0);
  });

  it("uses the effective Option use cost threshold and reduces one opponent by 2000 DP once", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-036", as: "host", under: ["BT19-030"] }] },
      1: { battleArea: [{ card: "BT19-020", as: "first" }, { card: "BT19-021", as: "second" }] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "reduced-use-cost" });
    expect(s.perm("first").currentDP).toBe(5000);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "pay-cost-reduced" });
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(5000);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 7, subjectPermanentId: "free-use" });
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(5000);
  });

  it("triggers after a cost-2 Option is actually used from hand (Q5459)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-036", as: "host", under: ["BT19-030"] }],
        hand: [{ card: "BT1-102", as: "option" }],
      },
      1: { battleArea: [{ card: "BT19-020", as: "target" }] },
    }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not trigger when an Option effect activates as a Security effect rather than being used (Q5460)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-036", as: "host", under: ["BT19-030"] }],
        security: [{ card: "BT1-102", as: "securityOption" }],
      },
      1: { battleArea: [{ card: "BT19-020", as: "target" }] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("does not apply the inherited Option-use effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-036", as: "host", under: ["BT19-030"] }] },
      1: { battleArea: [{ card: "BT19-020", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "option" });
    expect(s.perm("target").currentDP).toBe(5000);
  });
});
