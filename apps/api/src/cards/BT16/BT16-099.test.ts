import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-099.js";

describe("BT16-099", () => {
  it("reveals three, adds a SoC card, trashes one, and places itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "RevealAdd", revealCount: 3, rest: "deckBottom" },
        { kind: "Trash", target: { count: 1 }, condition: { kind: "ifThisEffectActed" } },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("models Delay to play a SoC card from trash with 2 cost reduction", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 2, optional: true }],
    });
  });

  it("repeats the reveal/trash/place effect from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "Trash" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("reveals a SoC card, trashes a hand card, bottoms the rest, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-071", as: "color" }],
          hand: [
            { card: "BT16-099", as: "option" },
            { card: "BT16-050", as: "discard" },
          ],
          deck: ["BT16-051", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-099"));
    expect(s.state.players[0]?.hand.some((card) => card.cardId === "BT16-051")).toBe(true);
    expect(s.state.players[0]?.hand).toHaveLength(1);
    expect(s.state.players[0]?.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.players[0]?.deck).toHaveLength(0);
  });
});
