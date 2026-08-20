import { describe, expect, it, vi } from "vitest";
import {
  CardKind,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { printedKeywordsOf } from "../../engine/combat/keywords.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import "./BT26-043.js";
import "../index.js";

const CARD_ID = "BT26-043";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(permanent: object): CardSource {
  return {
    instanceId: "piximon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => permanent as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-043 suspend, face-down payment, and lock", () => {
  function harness(options: { acceptPayment?: boolean; placementSucceeds?: boolean } = {}) {
    const deckTop = { instanceId: "deck-top", cardId: "AD1-001", faceUp: true };
    const oldFaceDown = { instanceId: "old-down", cardId: "AD1-001", faceUp: false };
    const self = {
      permanentId: "piximon",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "piximon-top", cardId: CARD_ID },
      stack: [oldFaceDown],
      inBreeding: false,
    };
    const suspended = {
      permanentId: "suspend-target",
      controllerSeat: 1 as Seat,
      topCard: { cardId: "DIGIMON" },
      stack: [],
      isSuspended: false,
      inBreeding: false,
    };
    const other = {
      permanentId: "lock-target",
      controllerSeat: 1 as Seat,
      topCard: { cardId: "TAMER" },
      stack: [],
      isSuspended: false,
      inBreeding: false,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [self], deck: [deckTop] },
      { seat: 1 as Seat, battleArea: [suspended, other], deck: [] },
    ];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, suspended, other].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon] }),
    } as unknown as GameAccess;
    const selections = [[suspended.permanentId], [other.permanentId], [suspended.permanentId]];
    const restrict = vi.fn();
    const placeUnder = vi.fn(async (_id: string, ids: string[], opts: { belowTop: boolean; faceUp: boolean }) => {
      if (options.placementSucceeds === false) return [];
      const placed = { ...deckTop, faceUp: opts.faceUp };
      self.stack.unshift(placed);
      players[0]!.deck = [];
      return ids.map(() => placed);
    });
    const source = makeSource(self);
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    const ctx = {
      source,
      game,
      ask: {
        chooseTargets: async () => selections.shift() ?? [],
        optional: async () => options.acceptPayment !== false,
      },
      fx: {
        suspend: async (ids: string[]) => {
          suspended.isSuspended = true;
          return ids;
        },
        placeUnder,
        restrict,
      },
    } as unknown as EffectContext;
    return { ctx, effect, self, suspended, other, restrict, placeUnder, deckTop };
  }

  it("pays with the actual deck top face down at stack bottom and locks one independently chosen target per face-down card (Q7034)", async () => {
    const h = harness();

    await h.effect.resolve(h.ctx);

    expect(h.suspended.isSuspended).toBe(true);
    expect(h.placeUnder).toHaveBeenCalledWith("piximon", [h.deckTop.instanceId], {
      belowTop: false,
      faceUp: false,
    });
    expect(h.self.stack.map((card) => [card.instanceId, card.faceUp])).toEqual([
      ["deck-top", false],
      ["old-down", false],
    ]);
    expect(h.restrict.mock.calls).toEqual([
      [h.other.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd],
      [h.suspended.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd],
    ]);
  });

  it("may decline the by-payment after the mandatory suspension and then grants no locks", async () => {
    const h = harness({ acceptPayment: false });

    await h.effect.resolve(h.ctx);

    expect(h.suspended.isSuspended).toBe(true);
    expect(h.placeUnder).not.toHaveBeenCalled();
    expect(h.restrict).not.toHaveBeenCalled();
  });

  it("grants no locks when moving the deck-top payment fails", async () => {
    const h = harness({ placementSucceeds: false });

    await h.effect.resolve(h.ctx);

    expect(h.placeUnder).toHaveBeenCalledOnce();
    expect(h.restrict).not.toHaveBeenCalled();
  });

  it("can still activate and pay the by-cost when the opponent has no initial suspend target", async () => {
    const h = harness();
    (h.ctx.game.player(1).battleArea as unknown[]).splice(0);

    expect(h.effect.canActivate(h.ctx)).toBe(true);
    await h.effect.resolve(h.ctx);

    expect(h.placeUnder).toHaveBeenCalledOnce();
    expect(h.restrict).not.toHaveBeenCalled();
  });
});

describe("BT26-043 inherited All Turns Once Per Turn watcher", () => {
  it("matches only the owner's played Digimon and re-arms after declining without spending the OPT", async () => {
    const host = { permanentId: "host" };
    const source = makeSource(host);
    const ownDigimon = { permanentId: "own", controllerSeat: 0 as Seat, topCard: { cardId: "DIGIMON" } };
    const opponentDigimon = { permanentId: "opp", controllerSeat: 1 as Seat, topCard: { cardId: "DIGIMON" } };
    const ownTamer = { permanentId: "tamer", controllerSeat: 0 as Seat, topCard: { cardId: "TAMER" } };
    const permanents = { own: ownDigimon, opp: opponentDigimon, tamer: ownTamer };
    const players = [{ battleArea: [ownDigimon] }, { battleArea: [opponentDigimon] }];
    const installs: SubTriggerInstall[] = [];
    const suspend = vi.fn(async (ids: string[]) => ids);
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: keyof typeof permanents) => permanents[id],
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon] }),
    } as unknown as GameAccess;
    const ctx = {
      source,
      game,
      ask: { optional: async () => false },
      fx: {
        subscribeSubTrigger: (subscription: SubTriggerInstall) => installs.push(subscription),
        suspend,
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnStartTurn, source)[0]!;

    await effect.resolve(ctx);
    expect(installs).toHaveLength(1);
    expect(installs[0]).toMatchObject({ event: "whenPlayed", once: true, sourcePermanentId: "host" });
    const subCtx = (subjectPermanentId: string) =>
      ({ ...ctx, trigger: { subjectPermanentId } }) as unknown as EffectContext;
    expect(installs[0]!.matches!(subCtx("own"))).toBe(true);
    expect(installs[0]!.matches!(subCtx("opp"))).toBe(false);
    expect(installs[0]!.matches!(subCtx("tamer"))).toBe(false);

    await installs[0]!.run(subCtx("own"));
    expect(installs).toHaveLength(2);
    expect(suspend).not.toHaveBeenCalled();

    ctx.ask.optional = async () => true;
    await installs[1]!.run(subCtx("own"));
    expect(suspend).toHaveBeenCalledWith(["opp"]);
    expect(installs).toHaveLength(2);
  });
});

describe("BT26-043 catalog integration", () => {
  it("plays for 6, suspends, moves the deck top face down to stack bottom, and applies the lock", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "piximon" }], deck: [{ card: "BT1-009", as: "deckTop" }] },
        1: { battleArea: [{ card: "BT1-013", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piximon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend"));

    const piximon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(piximon.stack.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("deckTop").instanceId, false],
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });

  it("uses the Lv.4 [DM] alternate evolution path for exact cost 3 and retains printed Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-009", as: "dmBase" }],
          hand: [{ card: CARD_ID, as: "piximon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dmBase").permanentId,
        instanceId: s.inst("piximon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dmBase").topCard.cardId === CARD_ID);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("dmBase").stack.map((card) => card.cardId)).toEqual(["EX9-009"]);
    expect(printedKeywordsOf(getCardDefinition(CARD_ID)?.effectText)).toContain("Blocker");
  });

  it("rejects the alternate path on a non-green Lv.4 without the exact DM trait", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "blueBase" }],
        hand: [{ card: CARD_ID, as: "piximon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("piximon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("blueBase").topCard.cardId).toBe("BT1-028");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });
});
