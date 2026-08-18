import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-058.js";

describe("BT9-058 Dorumon", () => {
  it("may trash an X Antibody card from hand to draw two", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-058", as: "source" }, { card: "BT9-062", as: "cost" }], deck: ["BT9-060", "BT9-061"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);
    expect(player.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
