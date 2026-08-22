import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./index.js";
import "./BT22-006.js";

describe("BT22-006 Moonmon", () => {
  it("installs a once-per-turn bottom-stack placement watcher", async () => {
    const permanent = {
      permanentId: "moon",
      topCard: { instanceId: "moon-card", cardId: "BT22-006", ownerSeat: 0 as Seat },
      stack: [],
      linked: [],
    };
    const source: CardSource = {
      instanceId: "moon-card",
      cardId: "BT22-006",
      ownerSeat: 0 as Seat,
      definition: {} as any,
      permanent: () => permanent as any,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    let subscription: any;
    const ctx: any = {
      source,
      game: { player: () => ({ hand: [] }), definitionOf: () => ({}) },
      fx: {
        subscribeSubTrigger: (value: any) => {
          subscription = value;
        },
      },
      ask: {},
    };
    const effect = getEffectModule("BT22-006")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve(ctx);
    expect(subscription).toMatchObject({
      event: "onAddDigivolutionCards",
      oncePerTurnKey: "BT22-006/on-add-divo-draw-trash",
    });
    const subContext = {
      source,
      trigger: { addedDigivolutionCardsPosition: "bottom", placedOwnTopAtStackBottom: true },
      game: ctx.game,
    };
    expect(subscription.matches(subContext)).toBe(true);
    expect(subscription.matches({ ...subContext, trigger: { addedDigivolutionCardsPosition: "top" } })).toBe(false);
    expect(
      subscription.matches({
        ...subContext,
        trigger: { addedDigivolutionCardsPosition: "bottom", placedOwnTopAtStackBottom: false },
      }),
    ).toBe(false);
  });

  it("draws and trashes only when the host's own top card is rotated to the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-006", "BT22-043"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const source = (s.engine as any).cardSourceOf(host.stack.find((card) => card.cardId === "BT22-043")!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-043/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT22-043");
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(host.stack[0]!.cardId).toBe("BT22-046");
  });
});
