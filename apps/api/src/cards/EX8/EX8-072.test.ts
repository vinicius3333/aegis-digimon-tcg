import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { PlayerState } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX8-072.js";

describe("EX8-072", () => {
  const source = {
    instanceId: "source",
    cardId: "EX8-072",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers the mandatory Main delete effect", () => {
    const module = getEffectModule("EX8-072")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
  });
  it("registers the [Trash][Your Turn] Barbamon (X Antibody) watcher", () => {
    const module = getEffectModule("EX8-072")!;
    const trashSource = { ...(source as object), isOnBattleArea: () => false } as never;
    expect(module.effectsForTiming(EffectTiming.None, trashSource)).toHaveLength(1);
  });
  it("does not register an unprinted security effect", () => {
    const module = getEffectModule("EX8-072")!;
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(0);
  });
  it("deletes an opponent level 7 or lower Digimon even when their hand has fewer than 5 cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purpleSource" }] }, 1: { battleArea: [{ card: "BT1-010", as: "target" }] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });

  it("recounts the hand after trashing before applying the level maximum", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purple-source" }] },
      1: {
        hand: [
          { card: "BT1-010", as: "hand-1" },
          { card: "BT1-010", as: "hand-2" },
          { card: "BT1-010", as: "hand-3" },
          { card: "BT1-010", as: "hand-4" },
          { card: "BT1-010", as: "hand-5" },
          { card: "BT1-010", as: "hand-6" },
        ],
        battleArea: [{ card: "AD1-004", as: "level-six" }],
      },
    }, { autoSelectCards: true });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);

    expect((s.state.players[1] as PlayerState).hand).toHaveLength(5);
    expect((s.state.players[1] as PlayerState).trash).toHaveLength(2);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });
});
