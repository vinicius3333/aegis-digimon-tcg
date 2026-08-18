import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT3-099.js";

describe("BT3-099 We Have to Stop Fighting!", () => {
  it("matches official metadata and publishes battle-only protection for both players", () => {
    expect(module.cardId).toBe("BT3-099");
    expect(getCardDefinition("BT3-099")).toMatchObject({
      nameEn: "We Have to Stop Fighting!",
      colors: ["Blue"],
      effectText: expect.stringContaining("Neither player's Digimon can be deleted in battle"),
      securityEffectText: expect.stringContaining("Add this card to your hand"),
    });
    expect(getCompiledCard("BT3-099")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "forTheTurn" }],
        },
        { trigger: "Security", actions: [{ kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("prevents battle deletion for both players' Digimon this turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-007", as: "mine" }, "BT3-020"], hand: [{ card: "BT3-099", as: "option" }] },
        1: { battleArea: [{ card: "BT3-009", as: "theirs" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("mine"), "beDeletedInBattle") &&
        observe(s.engine).isRestricted(s.perm("theirs"), "beDeletedInBattle"),
    );
    expect(observe(s.engine).isRestricted(s.perm("mine"), "beDeletedInBattle")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirs"), "beDeletedInBattle")).toBe(true);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-099", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
