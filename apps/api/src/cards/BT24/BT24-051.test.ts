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
        condition: { kind: "ifThisEffectActed" },
      });
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

  it("Q5641: choosing the DP bonus makes that Digimon attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-051", as: "merukimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("merukimon").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("merukimon"));
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("merukimon")));

    expect(s.perm("merukimon").currentDP).toBe(17000);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("merukimon"))).toBe(true);
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
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Piercing")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Piercing")).toBe(false);
  });
});
