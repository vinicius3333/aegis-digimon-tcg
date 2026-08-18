import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-055.js";

describe("BT8-055 Climbmon", () => {
  it("returns a suspended opposing Digimon with no more DP when this Digimon is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-069", as: "base", suspended: true }], hand: [{ card: "BT8-055", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target", suspended: true }] } }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.hand.some(card => card.cardId === "BT2-047"));
    expect(opponent.battleArea).toHaveLength(0);
  });
});
