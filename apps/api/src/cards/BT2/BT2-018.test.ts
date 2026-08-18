import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-018.js";

describe("BT2-018 Volcanicdramon", () => {
  it("deletes all opposing Digimon with 4000 DP or less", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-018", as: "source" }] }, 1: { battleArea: [
      { card: "BT1-029", as: "smallA", dp: 2000 }, { card: "BT1-070", as: "smallB", dp: 4000 },
      { card: "BT1-074", as: "large", dp: 7000 },
    ] } }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 1);
    expect(opponent.battleArea[0]?.permanentId).toBe(s.perm("large").permanentId);
  });

  it("has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-018", as: "volcanicdramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("volcanicdramon"), "SecurityAttack")).toBe(true);
  });
});
