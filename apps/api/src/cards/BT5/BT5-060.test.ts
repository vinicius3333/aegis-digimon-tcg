import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-060.js";

describe("BT5-060 Monitamon", () => {
  it("looks at the top card without moving or publicly revealing it", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-060", as: "source" }], deck: [
      { card: "BT5-061", as: "deckTop" },
    ] } });
    const player = s.state.players[0] as PlayerState;
    const topId = s.inst("deckTop").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "BT5-060"));
    expect(player.deck.map((card) => card.instanceId)).toEqual([topId]);
    expect(player.deck[0]?.faceUp).toBe(false);
  });

  it("reveals 3 on deletion, plays a Monitamon without cost, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-060", as: "source" }],
        deck: [
          { card: "BT5-060", as: "played" },
          { card: "BT5-061", as: "remainderA" },
          { card: "BT5-062", as: "remainderB" },
          { card: "BT5-071", as: "untouched" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const playedId = s.inst("played").instanceId;

    await (s.engine as any).primitives.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));

    expect(player.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("remainderA").instanceId,
      s.inst("remainderB").instanceId,
    ]);
  });
});
