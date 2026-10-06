import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";

describe("#5161 printed DP breeding movement", () => {
  it.each(["BT18-086", "EX2-007", "BT1-009"])("offers the breeding phase and moves %s", async (card) => {
    const s = setupEngine({
      0: { breeding: { card, as: "raised" }, battleArea: ["BT7-111"], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding || s.state.phase === Phase.Main);
    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === card)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps an ordinary Digi-Egg in breeding", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT1-001", as: "egg" } } });
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: false,
      reason: "not-movable",
    });
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-001");
  });
});
