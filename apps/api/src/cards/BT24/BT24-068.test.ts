import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT24_068 } from "./BT24-068.js";
import "../index.js";

describe("BT24-068 DemiDevimon", () => {
  it("reveals both printed trait categories, bottoms the rest, then trashes a hand card", () => {
    const onPlay = BT24_068.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Evil", "Fallen Angel"], match: "trait" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
  });

  it("adds one card from each printed trait category, bottoms the miss, and trashes a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-068", as: "demidevimon" }],
          hand: [{ card: "BT1-002", as: "handCost" }],
          deck: [
            { card: "BT11-080", as: "evil" },
            { card: "BT12-085", as: "demonLord" },
            { card: "BT1-001", as: "miss" },
          ],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("demidevimon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("demonLord").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("inherited attack trashes both players' top cards only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-069", as: "host", under: ["BT24-068"] }],
        deck: [
          { card: "BT1-001", as: "mineFirst" },
          { card: "BT1-002", as: "mineSecond" },
        ],
      },
      1: {
        deck: [
          { card: "BT1-003", as: "theirFirst" },
          { card: "BT1-004", as: "theirSecond" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mineFirst").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("theirFirst").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("mineSecond").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("theirSecond").instanceId]);
  });
});
