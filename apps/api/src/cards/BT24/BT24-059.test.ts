import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_059 } from "./BT24-059.js";
import "../index.js";

describe("BT24-059 Sharkmon", () => {
  it("models the inherited placement-and-unsuspend as an optional paid activation", () => {
    const inherited = BT24_059.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as any;
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({ kind: "Unsuspend", target: { filter: { isSelfRef: true } } });
    expect(action).toMatchObject({ optional: true, abortOnDecline: true });
    expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
  });

  it("public play pays 7 and De-Digivolves 1", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-059", as: "sharkmon" }] },
        1: { battleArea: [{ card: "BT24-051", as: "target", under: ["BT24-050"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sharkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT24-050");

    expect(s.perm("target").topCard.cardId).toBe("BT24-050");
    expect(s.state.memory).toBe(0);
  });

  it("On Deletion plays a cost-7-or-lower TS card suspended and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-059", as: "sharkmon" }],
          deck: [
            { card: "BT24-046", as: "ts" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sharkmonId = s.perm("sharkmon").permanentId;

    await advance(s.engine).verb.deletePermanent([sharkmonId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ts").instanceId),
    );
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ts").instanceId,
    );

    expect(played?.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("miss1").instanceId, s.inst("miss2").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sharkmonId)).toBe(false);
  });

  it.each([
    ["normal blue level-4 requirement", "BT1-032", false, undefined, 4],
    ["Aquatic trait-substring requirement", "BT12-025", true, 0, 3],
    ["Sea Animal trait-substring requirement", "BT1-033", true, 0, 3],
    ["TS requirement", "BT24-023", true, 1, 3],
  ])(
    "uses the %s and De-Digivolves 1",
    async (_label, baseCard, useAlternateCost, alternateRequirementIndex, expectedCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT24-059", as: "sharkmon" }],
          },
          1: { battleArea: [{ card: "BT24-051", as: "target", under: ["BT24-050"] }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("sharkmon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("sharkmon").instanceId);
      await settle(() => s.perm("target").topCard.cardId === "BT24-050");

      expect(s.state.memory).toBe(5 - expectedCost);
    },
  );

  it("inherited attack may place another Digimon underneath to unsuspend its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT24-059"] },
            { card: "BT1-010", as: "cost" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.perm("cost").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT1-010"));
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
  });
});
