import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-115.js";

describe("BT4-115 Lucemon", () => {
  it("costs 5 instead of 13 when played from hand with at least 10 cards in trash", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-115", as: "source" }], deck: ["BT4-041"], trash: Array.from({ length: 10 }, () => "BT4-033") } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("recovers the top deck card on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-115", as: "source" }], deck: [
      { card: "BT4-041", as: "recovered" },
    ] } });
    const player = s.state.players[0] as PlayerState;
    const recoveredId = s.inst("recovered").instanceId;
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.security.some((card) => card.instanceId === recoveredId));
    expect(player.deck).toHaveLength(0);
  });
});
