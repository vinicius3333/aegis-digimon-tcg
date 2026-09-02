import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-028.js";
import "../index.js";

describe("BT24-028 Divermon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-028")).toMatchObject({
      cardId: "BT24-028",
      nameEn: "Divermon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Aquabeast", "Titan", "TS"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the qualifying hand placement on entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.kind).toBe("GainKeyword");
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.abortOnDecline).toBe(true);
      expect(action.additionalEffect).toMatchObject({ kind: "GrantStatic", modifier: "cannotBeDeletedInBattle" });
    }
  });

  it("keeps the inherited TS play effect scoped to this stack", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      optional: true,
    });
    expect(action.target.filter).toMatchObject({ colors: ["Blue"], levelComparison: { op: "lte", value: 4 } });
  });

  it("uses an exact Neptunemon target for the free unsuspend evolution", () => {
    const action = (compiled.effects.find((effect) => effect.trigger === "YourTurn") as any).actions[0].actions[0];
    expect(action).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true });
    expect(action.into.namesExact).toEqual(["Neptunemon"]);
  });

  it("pays the placement cost before granting Blocker and battle-deletion immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "divermon" }],
          hand: [{ card: "BT24-027", as: "placed" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));

    expect(s.perm("divermon").stack[0]?.instanceId).toBe(s.inst("placed").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("divermon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("divermon"), "beDeletedInBattle")).toBe(true);
  });

  it("grants neither entry benefit when the placement cost is unavailable", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-028", as: "divermon" }] } });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));

    expect(observe(s.engine).hasKeyword(s.perm("divermon"), "Blocker")).toBe(false);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("divermon").permanentId], "byBattle")).toBe(1);
  });

  it("free-evolves into Neptunemon in the unsuspend trigger window (Q5608)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "divermon" }],
          hand: [{ card: "BT24-030", as: "neptunemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("divermon").permanentId,
    });
    await settle(() => s.perm("divermon").topCard.instanceId === s.inst("neptunemon").instanceId);

    expect(s.state.memory).toBe(5);
  });

  it("inherited play removes a level 4 blue TS card from this stack only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "host", under: [{ card: "BT24-027", as: "played" }, "BT24-028"] },
            { card: "BT24-028", as: "other", under: ["BT24-027"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
    const count = s.state.players[0]!.battleArea.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.battleArea).toHaveLength(count);
    expect(s.perm("other").stack.map((card) => card.cardId)).toContain("BT24-027");
  });

  it.each([
    ["Aqua in trait", "BT12-025", 0],
    ["Sea Animal trait", "BT1-033", 1],
    ["TS trait", "BT24-010", 2],
  ])("digivolves from a level 4 card with %s for cost 3", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-028", as: "divermon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("divermon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("divermon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
