import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_051 } from "./BT24-051.js";
import "../index.js";

describe("BT24-051 Merukimon", () => {
  it("shares the once-per-turn unsuspend between When Digivolving and When Attacking", () => {
    const effects = BT24_051.effects?.filter(
      (entry) =>
        ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger) && entry.actions?.[0]?.kind === "Unsuspend",
    );
    expect(effects).toHaveLength(2);
    expect(effects?.map((entry) => entry.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
    expect(effects?.every((entry) => entry.frequency === "OncePerTurn")).toBe(true);
  });
  it("makes the buffed Digimon attack an opponent's Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_051.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[2]).toMatchObject({
        kind: "Attack",
        optional: false,
      });
      expect(effect?.actions?.[1]).toMatchObject({ optional: true, abortOnDecline: true });
    }
  });

  it("reduces its play cost by 5 while at least three Digimon exist", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-009", "BT1-010"],
        hand: [{ card: "BT24-051", as: "merukimon" }],
      },
      1: { battleArea: ["BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-051"));

    expect(s.state.memory).toBe(3);
  });

  it("naturally plays, buffs, and attacks with the Q5641 sequence", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-051", as: "merukimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-009", as: "second", dp: 2000 },
            { card: "BT1-009", as: "third", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.perm("merukimon").currentDP).toBe(17000);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
  });

  it.each([
    ["normal green/blue requirement", false, 4],
    ["alternate Beastkin/TS requirement", true, 3],
  ])("uses the %s", async (_label, useAlternateCost, expectedCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-050", as: "base" }],
          hand: [{ card: "BT24-051", as: "merukimon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("merukimon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("merukimon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
  });

  it("Q5641: choosing the DP bonus makes that Digimon attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-051", as: "merukimon" }] },
        1: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("merukimon").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("merukimon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("merukimon").currentDP).toBe(17000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    // Its shared When Attacking unsuspend resolves during this combat, making it
    // eligible again; the defeated opposing Digimon is the durable attack proof.
    expect(s.perm("merukimon").isSuspended).toBe(false);
  });

  it("grants Rush and Piercing to Iliad Digimon only during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-051", as: "merukimon" },
          { card: "BT24-046", as: "iliad" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("iliad"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Rush")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("iliad"))).toBe(false);
  });
});
