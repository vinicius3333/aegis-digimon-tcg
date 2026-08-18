import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-082.js";

describe("BT10-082 Beelzemon", () => {
  it("may trash the top three cards of its deck on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-082", as: "source" }], deck: ["BT10-071", "BT10-072", "BT10-073"] } }, { autoAcceptOptional: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);
    expect(player.trash).toHaveLength(3);
  });

  it("deletes one level 4 or lower Digimon per 10 trash cards even when the mill is declined", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-082", as: "source" }],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
        trash: Array.from({ length: 20 }, () => "BT1-004"),
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "level3" },
          { card: "BT1-015", as: "level4" },
          { card: "BT1-021", as: "level5" },
        ],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true });
    s.state.memory = 10;
    const originalDeck = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(originalDeck);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("level5").permanentId);
  });
});
