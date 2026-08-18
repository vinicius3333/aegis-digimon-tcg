import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-086.js";

describe("BT7-086 Tommy Himi", () => {
  it("trashes three bottom digivolution cards from an opponent Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-086", as: "source" }] }, 1: { battleArea: [
      { card: "BT7-025", as: "target", under: ["BT7-020", "BT7-021", "BT7-022", "BT7-023"] },
    ] } }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(opponent.trash).toHaveLength(3);
  });
});
