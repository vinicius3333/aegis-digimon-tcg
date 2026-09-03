import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-098.js";

describe("BT12-098 compiled IR module", () => {
  it("registers its printed OnPlay effect through the compiled IR record", () => {
    const module = getEffectModule("BT12-098");
    expect(module?.cardId).toBe("BT12-098");
    const source = {
      instanceId: "source-098",
      cardId: "BT12-098",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("reveals three cards and adds a Save Digimon and a Hunter card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT12-098", as: "watchmaker" }], deck: ["BT12-008", "BT12-087", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("watchmaker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-008", "BT12-087"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("adds the Save Digimon when the reveal has no Hunter card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-098", as: "watchmaker" }],
          deck: ["BT12-008", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("watchmaker"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT12-087");
  });

  it("adds the Hunter card when the reveal has no Save Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-098", as: "watchmaker" }],
          deck: ["BT12-087", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("watchmaker"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-087");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT12-008");
  });

  it("adds nothing when the reveal has neither Save nor Hunter cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-098", as: "watchmaker" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("watchmaker"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("suspends with four Tamers to give a Save Digimon Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-098", as: "watchmaker" },
            "BT12-087",
            "BT12-088",
            "BT12-089",
            { card: "BT12-008", as: "save" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseOption, s.perm("watchmaker"));

    expect(s.perm("watchmaker").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("save"), "SecurityAttack")).toBe(true);
  });

  it("plays Watchmaker from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-098", as: "watchmaker", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("watchmaker"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-098")).toBe(true);
  });
});
