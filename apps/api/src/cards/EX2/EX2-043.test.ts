import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-043.js";

const digimonDefinition = {
  cardId: "EX2-043",
  set: "EX2",
  nameEn: "Gulfmon",
  kinds: ["Digimon"],
  colors: ["Purple"],
  playCost: 12,
  dp: 11000,
  level: 6,
  evoCosts: [],
  maxCountInDeck: 4,
} as unknown as CardDefinition;

function source(): CardSource {
  return {
    instanceId: "gulfmon-card",
    cardId: "EX2-043",
    ownerSeat: 0 as Seat,
    definition: digimonDefinition,
    permanent: () =>
      ({
        permanentId: "gulfmon",
        topCard: { instanceId: "gulfmon-card", cardId: "EX2-043", ownerSeat: 0 },
        stack: [],
        linked: [],
        isSuspended: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function context(subscription: { value?: SubTriggerInstall }, unsuspended: string[]): EffectContext {
  const cardSource = source();
  const players = [
    {
      hand: [],
      trash: [],
      deck: [],
      security: [],
      battleArea: [
        cardSource.permanent()!,
        {
          permanentId: "target",
          topCard: { instanceId: "target-card", cardId: "EX2-043", ownerSeat: 0 },
          stack: [],
          linked: [],
          isSuspended: true,
        },
      ],
    },
    { hand: [], trash: [], deck: [], security: [], battleArea: [] },
  ];
  return {
    source: cardSource,
    trigger: {},
    game: {
      state: { turnSeat: 0, memory: 3, players } as never,
      player: (seat) => players[seat] as never,
      opponentOf: (seat) => (seat === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: () => digimonDefinition,
    },
    ask: {
      optional: async () => true,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, 1),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, 1),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      chooseOption: async () => 0,
    },
    fx: {
      subscribeSubTrigger: (value: SubTriggerInstall) => {
        subscription.value = value;
        return 1;
      },
      unsuspend: (ids: string[]) => {
        unsuspended.push(...ids);
      },
    } as unknown as Primitives,
  };
}

describe("EX2-043 Gulfmon", () => {
  it("registers full compiled IR without residuals", () => {
    const compiled = registeredCompiledCards.get("EX2-043");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    const watcher = compiled?.effects.find((effect) => effect.actions.some((action) => action.kind === "SubTrigger"));
    expect(watcher?.actions.find((action) => action.kind === "SubTrigger")).toMatchObject({
      fireCondition: { kind: "triggerByYourEffect" },
      actions: [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] } } }],
    });
  });
  it("discards each player's excess hand down to exactly 5 when digivolving", async () => {
    const module = getEffectModule("EX2-043")!;
    const subscription: { value?: SubTriggerInstall } = {};
    const ctx = context(subscription, []);
    ctx.game
      .player(0)
      .hand.push(
        ...Array.from(
          { length: 7 },
          (_, i) => ({ instanceId: `p0-${i}`, cardId: "EX2-043", ownerSeat: 0 as Seat }) as never,
        ),
      );
    ctx.game
      .player(1)
      .hand.push(
        ...Array.from(
          { length: 6 },
          (_, i) => ({ instanceId: `p1-${i}`, cardId: "EX2-043", ownerSeat: 1 as Seat }) as never,
        ),
      );
    const trashed: string[] = [];
    ctx.fx.trash = async (ids) => {
      trashed.push(...ids);
      return [];
    };

    await module.effectsForTiming(EffectTiming.WhenDigivolving, ctx.source)[0]!.resolve(ctx);

    expect(trashed).toHaveLength(3);
    expect(trashed.filter((id) => id.startsWith("p0-"))).toHaveLength(2);
    expect(trashed.filter((id) => id.startsWith("p1-"))).toHaveLength(1);
  });

  it("installs a triggered watcher and never exposes the effect as an activated [Main]", async () => {
    const module = getEffectModule("EX2-043")!;
    const subscription: { value?: SubTriggerInstall } = {};
    const unsuspended: string[] = [];
    const ctx = context(subscription, unsuspended);

    expect(module.effectsForTiming(EffectTiming.OnDeclaration, ctx.source)).toHaveLength(0);
    await module.effectsForTiming(EffectTiming.None, ctx.source)[0]!.resolve(ctx);
    expect(subscription.value?.event).toBe("whenHandTrashed");

    const ownEffectCtx = { ...ctx, trigger: { handTrashedSeat: 0 as Seat, byEffectSeat: 0 as Seat } };
    expect(subscription.value!.matches?.(ownEffectCtx)).toBe(true);
    await subscription.value!.run(ownEffectCtx);
    expect(unsuspended).toEqual(["target"]);
  });

  it("ignores a discard caused by the opponent's effect", async () => {
    const module = getEffectModule("EX2-043")!;
    const subscription: { value?: SubTriggerInstall } = {};
    const unsuspended: string[] = [];
    const ctx = context(subscription, unsuspended);
    await module.effectsForTiming(EffectTiming.None, ctx.source)[0]!.resolve(ctx);

    const opponentEffectCtx = { ...ctx, trigger: { handTrashedSeat: 0 as Seat, byEffectSeat: 1 as Seat } };
    expect(subscription.value!.matches?.(opponentEffectCtx)).toBe(false);
    expect(unsuspended).toEqual([]);
  });
});
