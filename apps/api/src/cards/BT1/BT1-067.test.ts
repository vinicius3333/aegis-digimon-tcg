import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-067.js";

describe("BT1-067 Palmon", () => {
  it("adds one revealed level 4 Digimon to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-067", as: "palmon" }], deck: [
      { card: "BT1-070", as: "levelFour" }, { card: "BT1-068", as: "levelThree" }, { card: "BT1-074", as: "levelFive" },
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const levelFourId = s.inst("levelFour").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === levelFourId));

    expect(player.deck).toHaveLength(2);
  });
});
