import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-060.js";

describe("BT5-060 Monitamon", () => {
  it("looks at the top card without moving or publicly revealing it", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT5-060", as: "source" }], deck: [{ card: "BT5-061", as: "deckTop" }] },
    });
    const player = s.state.players[0] as PlayerState;
    const topId = s.inst("deckTop").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "BT5-060"));
    expect(player.deck.map((card) => card.instanceId)).toEqual([topId]);
    expect(player.deck[0]?.faceUp).toBe(false);
  });

  it("reveals 3 on deletion, plays a Monitamon without cost, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-060", as: "source" }],
          deck: [
            { card: "BT5-060", as: "played" },
            { card: "BT5-060", as: "unselected" },
            { card: "BT5-061", as: "remainderA" },
            { card: "BT5-071", as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const playedId = s.inst("played").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));

    expect(player.battleArea).toHaveLength(1);
    expect(player.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("unselected").instanceId,
      s.inst("remainderA").instanceId,
    ]);
  });

  it("may decline the revealed Monitamon and bottom all three revealed cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-060", as: "source" }],
        deck: [
          { card: "BT5-060", as: "candidate" },
          { card: "BT5-061", as: "remainderA" },
          { card: "BT5-062", as: "remainderB" },
          { card: "BT5-071", as: "untouched" },
        ],
      },
    });
    const player = s.state.players[0] as PlayerState;

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.battleArea).toHaveLength(0);
    expect(player.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("candidate").instanceId,
      s.inst("remainderA").instanceId,
      s.inst("remainderB").instanceId,
    ]);
  });

  it("does not play a card when the revealed cards have no Monitamon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-060", as: "source" }], deck: ["BT5-061", "BT5-062", "BT5-063"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.deck.length === 3);
    expect(player.battleArea).toHaveLength(0);
    expect(player.deck).toHaveLength(3);
  });
});
