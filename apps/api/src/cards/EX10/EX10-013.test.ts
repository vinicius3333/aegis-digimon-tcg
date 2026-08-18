import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import "./EX10-013.js";

// EX10-013 Lucemon: ＜Blocker＞ (own + ESS), [Breeding][When Digivolving] may move
// (blocked), and [End of Your Turn] return-5-[Lucemon]-text-then-digivolve-into-Chaos-Mode.

const cardId = "EX10-013";

/** A loose CardInstance for the trash pool (only the fields the card reads). */
const inst = (instanceId: string, cId: string): CardInstance =>
  ({ instanceId, cardId: cId, ownerSeat: 0, faceUp: true }) as unknown as CardInstance;

/** A minimal source whose `permanent()` and on-field flags are configurable. */
function makeSource(permanent: Permanent | undefined, onField = true, ownersTurn = true): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: definitionOf(cardId),
    permanent: () => permanent,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => ownersTurn,
    hasColor: () => false,
  };
}

/** A fake permanent topped by EX10-013 Lucemon (Yellow Lv.3). */
function selfPermanent(opts?: { inBreeding?: boolean }): Permanent {
  return {
    permanentId: "p-self",
    controllerSeat: 0,
    topCard: inst("self", cardId),
    stack: [],
    linked: [],
    baseDP: 10000,
    currentDP: 10000,
    isSuspended: false,
    inBreeding: opts?.inBreeding ?? false,
  } as unknown as Permanent;
}

/** Build a fake EffectContext over a configurable trash pool + recorded fx calls. */
function makeCtx(args: {
  source: CardSource;
  trash: CardInstance[];
  optionalAnswers?: boolean[];
  selectAnswers?: string[][];
}): {
  ctx: EffectContext;
  calls: {
    grantKeyword: { permanentId: string; keyword: string; duration: EffectDuration }[];
    returnToDeck: { ids: string[]; toTop?: boolean }[];
    digivolve: { target: string; source: string; payCost?: boolean }[];
  };
} {
  const calls = {
    grantKeyword: [] as { permanentId: string; keyword: string; duration: EffectDuration }[],
    returnToDeck: [] as { ids: string[]; toTop?: boolean }[],
    digivolve: [] as { target: string; source: string; payCost?: boolean }[],
  };
  let optIdx = 0;
  let selIdx = 0;
  const player = { seat: 0, trash: args.trash } as never;

  const ctx = {
    source: args.source,
    trigger: {},
    game: {
      player: () => player,
      opponentOf: (s: number) => (s === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: (c: CardInstance) => definitionOf(c.cardId),
    },
    fx: {
      grantKeyword: (permanentId: string, keyword: string, duration: EffectDuration) =>
        calls.grantKeyword.push({ permanentId, keyword, duration }),
      returnToDeck: (ids: string[], o?: { toTop?: boolean }) => {
        calls.returnToDeck.push({ ids, toTop: o?.toTop });
        return [];
      },
      digivolveFromInstance: async (target: string, src: string, o?: { payCost?: boolean }) => {
        calls.digivolve.push({ target, source: src, payCost: o?.payCost });
        return undefined;
      },
    },
    ask: {
      optional: async () => args.optionalAnswers?.[optIdx++] ?? true,
      selectCards: async () => args.selectAnswers?.[selIdx++] ?? [],
      chooseTargets: async () => [],
      chooseOption: async () => 0,
    },
  } as unknown as EffectContext;

  return { ctx, calls };
}

const requireModule = () => {
  const mod = getEffectModule(cardId);
  expect(mod, "EX10-013 must be registered").toBeDefined();
  return mod!;
};

/** Grab the single effect a timing contributes, asserting exactly one exists. */
function onlyEffect(timing: EffectTiming, source: CardSource) {
  const effects = requireModule().effectsForTiming(timing, source);
  expect(effects).toHaveLength(1);
  return effects[0]!;
}

describe("EX10-013 Lucemon", () => {
  it("registers a hand-written module (not the inert IR stub)", () => {
    expect(requireModule().cardId).toBe(cardId);
  });

  it("contributes own + inherited ＜Blocker＞ at the static (None) window", () => {
    const effects = requireModule().effectsForTiming(EffectTiming.None, makeSource(undefined));
    expect(effects).toHaveLength(2);
    const own = effects.find((e) => e.effectKey === `${cardId}/blocker`);
    const ess = effects.find((e) => e.effectKey === `${cardId}/blocker-ess`);
    expect(own?.isInherited).toBe(false);
    expect(ess?.isInherited).toBe(true);
  });

  it("grants ＜Blocker＞ to the carrying permanent when the static effect resolves", async () => {
    const perm = selfPermanent();
    const source = makeSource(perm);
    const effects = requireModule().effectsForTiming(EffectTiming.None, source);
    const { ctx, calls } = makeCtx({ source, trash: [] });
    for (const e of effects) {
      expect(e.canTrigger(ctx)).toBe(true);
      await e.resolve(ctx);
    }
    // Both the own and the ESS clause grant ＜Blocker＞ to the permanent this card is part of.
    expect(calls.grantKeyword).toHaveLength(2);
    for (const g of calls.grantKeyword) {
      expect(g).toMatchObject({ permanentId: "p-self", keyword: "Blocker" });
    }
  });

  it("offers [When Digivolving] may-move only in the breeding area, and is inert (blocked)", async () => {
    const effBattle = onlyEffect(EffectTiming.WhenDigivolving, makeSource(selfPermanent()));
    expect(effBattle.optional).toBe(true);
    // canActivate is false on a battle-area permanent (the move only applies in breeding).
    const battleCtx = makeCtx({ source: makeSource(selfPermanent()), trash: [] }).ctx;
    expect(effBattle.canActivate(battleCtx)).toBe(false);

    // In the breeding area canActivate is true, but resolve is an inert no-op (blocked):
    // no move primitive exists. It must not throw and must not call any fx verb.
    const breedingPerm = selfPermanent({ inBreeding: true });
    const source = makeSource(breedingPerm);
    const effBreeding = onlyEffect(EffectTiming.WhenDigivolving, source);
    const { ctx, calls } = makeCtx({ source, trash: [] });
    expect(effBreeding.canActivate(ctx)).toBe(true);
    await expect(effBreeding.resolve(ctx)).resolves.toBeUndefined();
    expect(calls.grantKeyword).toHaveLength(0);
    expect(calls.returnToDeck).toHaveLength(0);
    expect(calls.digivolve).toHaveLength(0);
  });

  it("[End of Your Turn]: requires >=5 [Lucemon]-text cards AND a legal Chaos Mode in trash", () => {
    const perm = selfPermanent();
    const source = makeSource(perm);
    const eff = onlyEffect(EffectTiming.OnEndTurn, source);
    expect(eff.optional).toBe(true);

    // Only 4 [Lucemon]-text cards in trash: not enough to pay the cost (Q5039
    // all-or-nothing => 5 needed), so the effect is not offered even with no Chaos Mode.
    const fourLucemon = ["BT18-034", "BT18-086", "AD1-017", "AD1-018"].map((id, i) => inst(`l${i}`, id));
    const ctxFew = makeCtx({ source, trash: fourLucemon }).ctx;
    expect(eff.canActivate(ctxFew)).toBe(false);

    // A Chaos Mode (EX10-052) is itself a [Lucemon]-text card (its name contains
    // "Lucemon"), so 4 others + 1 Chaos Mode satisfies the 5-card COST pool. But the
    // digivolution target legality (Q5041) still applies: EX10-052's printed EvoCost is
    // Yellow/Purple Lv.4, and a bare EX10-013 Lucemon is Lv.3. Under exact-level legality
    // (documented behavior `targetPermanent.Level == evoCost.Level`; the EotT effect's
    // IsChaosMode routes through CanPlayCardTargetFrame(..., ignore=None) at documented behavior
    // so the level requirement is NOT relaxed) Lv.3 != Lv.4 => EX10-052 is NOT a legal
    // target. With no other Chaos Mode in the trash there is no legal digivolution, so the
    // effect is NOT offered. (Under the prior `<=` bug Lv.3 <= Lv.4 wrongly matched and this
    // was asserted true; cardData.ts:173/:202 now use `===`.)
    const chaos = inst("c", "EX10-052"); // Lv.4 EvoCost; an EX10-013 Lv.3 base does NOT meet it.
    const ctxFourPlusChaos = makeCtx({ source, trash: [...fourLucemon, chaos] }).ctx;
    expect(eff.canActivate(ctxFourPlusChaos)).toBe(false);

    // 5 [Lucemon]-text cards but the only Chaos Mode (BT7-111) has NO printed EvoCost =>
    // illegal digivolution target (Q5041/Q4999) => effect not offered.
    const fiveLucemon = ["BT18-034", "BT18-086", "AD1-017", "AD1-018", "BT13-087"].map((id, i) =>
      inst(`l${i}`, id),
    );
    const ctxNoLegalChaos = makeCtx({ source, trash: [...fiveLucemon, inst("c", "BT7-111")] }).ctx;
    expect(eff.canActivate(ctxNoLegalChaos)).toBe(false);

    // 5 Lucemon-text + an EX10-052 Chaos Mode is STILL not offered: a Lv.3 Lucemon cannot
    // meet EX10-052's Lv.4 EvoCost (Q5041, exact-level), so no legal target exists. No real
    // catalog pairing makes a bare Lucemon -> Chaos Mode legal (every "Lucemon" base is Lv.3,
    // every Chaos Mode with an EvoCost requires Lv.4), so the documented behavior-faithful outcome here is a
    // rejection, not an offer.
    const ctxFivePlusChaos = makeCtx({ source, trash: [...fiveLucemon, chaos] }).ctx;
    expect(eff.canActivate(ctxFivePlusChaos)).toBe(false);
  });

  it("[End of Your Turn]: pays the cost but offers NO digivolve when no legal Chaos Mode exists", async () => {
    // documented behavior-faithful (Q5041): a bare Lv.3 EX10-013 Lucemon cannot meet EX10-052's Lv.4 EvoCost
    // (documented behavior exact `==`; IsChaosMode uses CanPlayCardTargetFrame ignore=None,
    // documented behavior). canActivate is false so the effect would not normally be offered; if
    // resolve is reached anyway (cost pool satisfied), the cost is paid but the digivolve is
    // not performed because chaosModeTargets() is empty. This is the resolve-side mirror of
    // the legality gate; under the prior `<=` bug a Lv.3 base wrongly matched the Lv.4 cost
    // and a digivolve was (incorrectly) emitted.
    const perm = selfPermanent();
    const source = makeSource(perm);
    const eff = onlyEffect(EffectTiming.OnEndTurn, source);

    const fiveLucemon = ["BT18-034", "BT18-086", "AD1-017", "AD1-018", "BT13-087"].map((id, i) =>
      inst(`l${i}`, id),
    );
    const chaos = inst("chaos", "EX10-052"); // Lv.4 EvoCost; illegal target for a Lv.3 base.
    const fiveIds = fiveLucemon.map((c) => c.instanceId);
    const { ctx, calls } = makeCtx({
      source,
      trash: [...fiveLucemon, chaos],
      selectAnswers: [fiveIds],
      optionalAnswers: [true],
    });
    await eff.resolve(ctx);

    // The cost is still paid (5 returned to deck bottom), but no legal Chaos Mode target
    // exists under exact-level legality, so no digivolve is emitted.
    expect(calls.returnToDeck).toHaveLength(1);
    expect(calls.returnToDeck[0]).toMatchObject({ ids: fiveIds, toTop: false });
    expect(calls.digivolve).toHaveLength(0);
  });

  it("[End of Your Turn]: paying the cost without a digivolve is legal (Q5040)", async () => {
    // Q5040: after returning the 5 cards you MAY decline the digivolve. We assert the
    // engine's separable cost/digivolve structure: the cost is paid and no digivolve is
    // forced. NOTE: with exact-level legality (cardData.ts:173 `===`) there is no real
    // catalog Chaos Mode a bare Lv.3 Lucemon can legally digivolve into (every Chaos Mode
    // EvoCost is Lv.4), so chaosModeTargets() is empty and the digivolve is never offered —
    // the `optionalAnswers:[false]` decline is therefore not reached here. The "cost paid,
    // no digivolve" outcome that Q5040 sanctions still holds; the explicit decline branch is
    // separately covered by the engine's `ctx.ask.optional` opt-out and cannot be exercised
    // with real cards until a Lv.3-EvoCost Chaos Mode (or an alternate-requirement target)
    // exists in the catalog.
    const source = makeSource(selfPermanent());
    const eff = onlyEffect(EffectTiming.OnEndTurn, source);

    const fiveLucemon = ["BT18-034", "BT18-086", "AD1-017", "AD1-018", "BT13-087"].map((id, i) =>
      inst(`l${i}`, id),
    );
    const fiveIds = fiveLucemon.map((c) => c.instanceId);
    const { ctx, calls } = makeCtx({
      source,
      trash: [...fiveLucemon, inst("chaos", "EX10-052")],
      selectAnswers: [fiveIds],
      optionalAnswers: [false], // decline the digivolve after paying (unreached: no legal target)
    });
    await eff.resolve(ctx);

    expect(calls.returnToDeck).toHaveLength(1); // cost still paid
    expect(calls.digivolve).toHaveLength(0); // but no digivolve
  });

  it("[End of Your Turn]: returning fewer than 5 aborts without paying (Q5039)", async () => {
    const source = makeSource(selfPermanent());
    const eff = onlyEffect(EffectTiming.OnEndTurn, source);

    const fiveLucemon = ["BT18-034", "BT18-086", "AD1-017", "AD1-018", "BT13-087"].map((id, i) =>
      inst(`l${i}`, id),
    );
    const { ctx, calls } = makeCtx({
      source,
      trash: [...fiveLucemon, inst("chaos", "EX10-052")],
      selectAnswers: [["l0", "l1", "l2", "l3"]], // only 4 chosen
    });
    await eff.resolve(ctx);

    expect(calls.returnToDeck).toHaveLength(0);
    expect(calls.digivolve).toHaveLength(0);
  });
});
