import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-13.js";

describe("ST20-13 Tai Kamiya & Izzy Izumi", () => {
  it("reduces an Adventure Digimon's play cost by suspending this Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST20-13", as: "tamer" }], hand: [{ card: "ST20-07", as: "adventure" }] } },
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

  it("grants Blocker to own Adventure Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST20-13", as: "tamer" },
          { card: "ST20-07", as: "adventure" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "nonAdventure" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("adventure"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonAdventure"), "Blocker")).toBe(false);
  });

  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST20-13", as: "securityTamer", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityTamer").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityTamer").instanceId),
    ).toBe(true);
  });
});
