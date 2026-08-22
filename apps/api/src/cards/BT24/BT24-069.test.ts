import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_069 } from "./BT24-069.js";
import "../index.js";

describe("BT24-069 Vilemon", () => {
  it("lets the opponent choose their discard and mills only when they decline", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      const actions = BT24_069.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        chooser: "opponent",
        optional: true,
      });
      expect(actions[2]).toMatchObject({
        kind: "TrashTopDeck",
        controller: "opponent",
        amount: 2,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });

  it("trashes from both hands without milling when the opponent accepts", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-069", as: "vilemon" }],
          hand: [{ card: "BT1-001", as: "ownCard" }],
        },
        1: {
          hand: [{ card: "BT1-002", as: "opponentCard" }],
          deck: [
            { card: "BT1-003", as: "firstDeck" },
            { card: "BT1-004", as: "secondDeck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("vilemon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("mills two opposing cards when the opponent declines the discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-069", as: "vilemon" }],
          hand: [{ card: "BT1-001", as: "ownCard" }],
        },
        1: {
          hand: [{ card: "BT1-002", as: "opponentCard" }],
          deck: [
            { card: "BT1-003", as: "firstDeck" },
            { card: "BT1-004", as: "secondDeck" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("vilemon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDeck").instanceId, s.inst("secondDeck").instanceId]),
    );
  });

  it("gains Blocker and 2000 DP at 10 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-069", as: "vilemon" }] },
      1: { trash: Array.from({ length: 10 }, () => "BT1-001") },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(true);
    expect(s.perm("vilemon").currentDP).toBe(6000);
  });

  it("inherited attack trashes both players' top cards only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-070", as: "host", under: ["BT24-069"] }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
