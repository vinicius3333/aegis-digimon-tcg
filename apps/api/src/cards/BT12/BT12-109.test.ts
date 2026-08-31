import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-091.js";
import "./BT12-109.js";

describe("BT12-109 Overflowing Power", () => {
  it("registers its printed Security add-to-hand effect", () => {
    const module = getEffectModule("BT12-109");
    const source = { instanceId: "source-109", cardId: "BT12-109", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("waives its color requirement with a Hunter Tamer and digivolves from under that Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-074", as: "base" },
            { card: "BT12-091", as: "hunter", under: [{ card: "BT12-077", as: "saved" }] },
          ],
          hand: [{ card: "BT12-109", as: "option" }],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("saved").instanceId &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-109"),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT12-077");
    expect(s.perm("hunter").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT12-109");
    expect(s.state.memory).toBe(1);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.decisions.every(({ req }) => req.sourceCardId === "BT12-109")).toBe(true);
  });

  it("does not waive the color requirement without a Hunter Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-008", as: "base" },
          { card: "BT1-085", as: "tamer", under: [{ card: "BT12-011", as: "saved" }] },
        ],
        hand: [{ card: "BT12-109", as: "option" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.perm("base").topCard.cardId).toBe("BT12-008");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-011"]);
  });
});
