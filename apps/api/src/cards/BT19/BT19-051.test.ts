import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-051 AtlurBallistamon", () => {
  it("has the Xros Heart level-4 cost-3 route and limits Ballistamon naming to DigiXros (Q3105)", async () => {
    expect(digivolutionRequirementsFor("BT19-051")).toContainEqual({
      level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: true,
    });
    expect(runtimeCompiledCard("BT19-051")?.effects[0]?.actions[0]).toMatchObject({
      kind: "GrantStatic", grant: "name", tokens: ["Ballistamon"], digiXrosOnly: true,
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-051", as: "atlur" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("atlur"))).not.toContain("ballistamon");
  });

  it("publicly evolves from an Xros Heart level 4 for 3", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-033", as: "base" }], hand: [{ card: "BT19-051", as: "atlur" }], deck: ["BT19-030"],
    } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("atlur").instanceId,
      useAlternateCost: true, alternateRequirementIndex: 0,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-051");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.state.memory).toBe(2);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])("%s gives the same target +3000 DP and return protection", async (timing) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-051", as: "atlur" }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(timing, s.perm("atlur"));
    expect(s.perm("atlur").currentDP).toBe(10000);
    expect(observe(s.engine).isRestricted(s.perm("atlur"), "beReturned")).toBe(true);
    await advance(s.engine).verb.returnToHand([s.perm("atlur").topCard!.instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-051")).toBe(true);
  });

  it.each(["hand", "trash"] as const)("On Deletion may place a %s Xros Heart card under a Tamer", async (zone) => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-051", as: "atlur" }, { card: "BT19-081", as: "tamer" }],
      ...(zone === "hand" ? { hand: ["BT19-047"] } : { trash: ["BT19-047"] }),
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("atlur").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-047"));
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-047"]);
  });

  it("inherited Blocker applies only to an Xros Heart host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-038", as: "host", under: ["BT19-051"] },
      { card: "BT19-015", as: "plain", under: ["BT19-051"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });
});
