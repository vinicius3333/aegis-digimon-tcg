import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-15.js";

describe("ST20-15 Island of Adventure", () => {
  it("adds the top security card to hand and replaces itself face up on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        hand: [{ card: "ST20-15", as: "option" }],
        security: [
          { card: "BT1-001", as: "securityTop" },
          { card: "BT1-002", as: "securityBelow" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 0;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "ST20-15");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.security[0]!.cardId).toBe("ST20-15");
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });

  it("gives a level 3-or-higher Digimon +2000 DP while revealed in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST20-15", as: "securityOption", faceUp: true }],
        battleArea: [{ card: "ST20-11", as: "digimon" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("digimon").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Blocker")).toBe(false);
  });

  it("plays a Tamer from hand when revealed as security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST20-15", as: "securityOption", faceUp: true }],
          hand: [{ card: "ST20-12", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("places itself face up even when there is no top security card to add", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        hand: [{ card: "ST20-15", as: "option" }],
      },
    });
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: optionId, faceUp: true });
  });

  it("cannot ignore its color requirement while an Island is already face up in security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST20-07", as: "adventure" }],
        hand: [{ card: "ST20-15", as: "option" }],
        security: [{ card: "ST20-15", as: "existingIsland", faceUp: true }],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
