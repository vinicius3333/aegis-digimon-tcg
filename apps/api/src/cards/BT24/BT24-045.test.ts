import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_045 } from "./BT24-045.js";
import "../index.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT24-045 Ogremon", () => {
  it("requires the hand-trash cost and locks the suspended target until opponent turn end", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const effect = BT24_045.effects?.find((entry) => entry.trigger === trigger);
      const suspend = effect?.actions?.[0] as any;
      const restrict = effect?.actions?.[1] as any;
      expect(suspend).toMatchObject({ optional: true, abortOnDecline: true });
      expect(restrict).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
    const inherited = BT24_045.effects?.find((entry) => entry.isInherited);
    const watcher = inherited?.actions?.[0];
    if (watcher?.kind !== "SubTrigger") throw new Error("expected inherited hand-trash watcher");
    expect(watcher.actions[0]).toMatchObject({ payCost: true, costDelta: -1 });
  });

  it("trashes a hand card to suspend and lock the same opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-045", as: "ogremon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ogremon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("may decline the hand-trash activation without suspending anything", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-045", as: "ogremon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ogremon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });

  it("Q5635: only the first of two trashed copies draws after the hand rises above five", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT24-045", as: "first" },
          { card: "BT24-045", as: "second" },
          "BT1-009",
          "BT1-010",
          "BT1-011",
          "BT1-012",
          "BT1-013",
        ],
        deck: ["BT1-014", "BT1-015"],
      },
    });
    await s.ready();

    await primitivesOf(s).trash([s.inst("first").instanceId, s.inst("second").instanceId], { byEffectSeat: 0 });

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("pays the reduced cost to inherited-evolve only its own Demon or Titan host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "host", under: ["BT24-045"] },
            { card: "BT24-072", as: "other" },
          ],
          hand: [
            { card: "BT24-045", as: "playedOgremon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "suspendTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("playedOgremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.perm("other").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it.each([
    ["normal green requirement", "BT1-065", false, 3],
    ["alternate Demon requirement", "BT11-021", true, 2],
    ["alternate TS requirement", "BT24-031", true, 2],
  ])("digivolves through the %s", async (_label, baseCard, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-045", as: "ogremon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ogremon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ogremon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
  });
});
