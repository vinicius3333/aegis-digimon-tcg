import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-080.js";

describe("BT2-080 Piedmon", () => {
  it("plays up to two level 4 or lower purple Digimon from trash without paying costs", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-080", as: "source" }], trash: [
      { card: "BT2-067", as: "purpleA" }, { card: "BT2-071", as: "purpleB" },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.length === 3);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-080", as: "piedmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("piedmon"), "Retaliation")).toBe(true);
  });
});
