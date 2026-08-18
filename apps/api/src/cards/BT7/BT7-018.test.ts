import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-018.js";
import "./BT7-027.js";

describe("BT7-018 Gomamon", () => {
  it("draws two cards when played from digivolution cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-027", as: "whamon" }], battleArea: [
      { card: "BT7-024", as: "carrier", under: [{ card: "BT7-018", as: "gomamon" }] },
    ], deck: [{ card: "BT7-020", as: "drawA" }, { card: "BT7-021", as: "drawB" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);
    const drawnIds = new Set([s.inst("drawA").instanceId, s.inst("drawB").instanceId]);
    expect(s.events.some((event) => event.kind === "cardsMoved" && event.to === "hand" && event.instanceIds.some((id) => drawnIds.has(id)))).toBe(true);
  });
});
