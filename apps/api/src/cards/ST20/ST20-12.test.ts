import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-12.js";

describe("ST20-12 Sora & Kari", () => {
  it("gains memory at the start of the main phase when an Adventure Digimon is present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-12", as: "tamer" }, "ST20-07"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(1);
  });

  it("reduces an Adventure Digimon's play cost by suspending this Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST20-12", as: "tamer" }], hand: [{ card: "ST20-07", as: "adventure" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST20-07"));
    expect(s.state.memory).toBe(3);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
