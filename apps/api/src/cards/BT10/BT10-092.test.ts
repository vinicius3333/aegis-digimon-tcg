import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-092.js";

describe("BT10-092 Nene Amano", () => {
  it("adds an eligible Twilight card from four revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-092", as: "source" }], deck: [
      { card: "BT10-061", as: "eligible" }, "BT10-062", "BT10-064", "BT10-065",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some(c => c.instanceId === s.inst("eligible").instanceId));
    expect(player.deck).toHaveLength(3);
  });

  it("grants Blocker to every DarkKnightmon and Twilight Digimon only on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-092", as: "nene" },
          { card: "BT10-066", as: "darkKnightmon" },
          { card: "BT10-061", as: "twilight" },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
    });

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("darkKnightmon"), "Blocker")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("darkKnightmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("twilight"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
  });
});
