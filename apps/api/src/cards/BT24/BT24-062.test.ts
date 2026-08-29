import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_062 } from "./BT24-062.js";
import "../index.js";

describe("BT24-062 MasterBlimpmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-062")).toMatchObject({
      cardId: "BT24-062",
      nameEn: "MasterBlimpmon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine", "Iliad", "TS"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("plays the qualifying card from this Digimon's stack at either shared timing", () => {
    const effects = BT24_062.effects?.filter((entry) => ["EndOfAttack", "EndOfOpponentsTurn"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"] });
      expect((effect.actions?.[0] as any).target.source).toBe("thisDigimon");
    }
  });

  it("has Blocker and Armor Purge", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-062", as: "master" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("master"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("master"), "Armor Purge")).toBe(true);
  });

  it("Armor Purge keeps the underlying Digimon in play when deletion is attempted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-062", as: "master", under: ["BT24-058"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const permanentId = s.perm("master").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("master").topCard.cardId === "BT24-058");

    expect(s.perm("master").permanentId).toBe(permanentId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-062");
  });

  it.each([
    ["normal black level-4 requirement", "BT15-061", false, 4],
    ["normal blue level-4 requirement", "BT10-020", false, 4],
    ["alternate Machine requirement", "BT15-061", true, 3],
    ["alternate Cyborg requirement", "BT10-020", true, 3],
    ["alternate TS requirement", "BT24-046", true, 3],
  ])("uses the %s", async (_label, baseCard, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-062", as: "master" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("master").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("master").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
  });

  it("plays only from its own stack and shares once-per-turn use across both timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-062", as: "master", under: ["BT24-058", "BT24-058"] },
            { card: "BT24-058", as: "neighbor", under: ["BT24-058"] },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("master").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle(() => !observe(s.engine).isAttacking());
    const masterStackAfterFirst = s.perm("master").stack.length;
    const neighborStackAfterFirst = s.perm("neighbor").stack.length;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("master"));

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("master").stack).toHaveLength(masterStackAfterFirst);
    expect(s.perm("neighbor").stack).toHaveLength(neighborStackAfterFirst);
  });

  it("inherited attack-target lock exists only during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-063", as: "host", under: ["BT24-062"] }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
