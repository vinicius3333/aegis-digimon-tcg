import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent, Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import "./EX11-074.js";
import "../index.js";

// EX11-074 Vortexdramon (Green Lv.7):
//   - Static: ＜Piercing＞ ＜Vortex＞ ＜Blocker＞ (continuous keyword grants).
//   - [When Digivolving] / [When Attacking]: may suspend 1 Digimon (either side, Q5948);
//     if a YOUR-side Digimon was suspended, this Digimon gains "opponent's effects don't
//     affect it" (beAffected) + +6000 DP until the opponent's turn ends.
//   - [All Turns][OPT]: when any Digimon suspend, may unsuspend self, then may directly
//     battle one opponent Digimon through the production forceBattle seam.

const cardId = "EX11-074";

const inst = (instanceId: string, cId: string): CardInstance =>
  ({ instanceId, cardId: cId, ownerSeat: 0, faceUp: true }) as unknown as CardInstance;

function makeSource(permanent: Permanent | undefined, onField = true): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: definitionOf(cardId),
    permanent: () => permanent,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

/** A fake permanent topped by EX11-074 (Green Lv.7), controlled by seat 0 (us). */
function selfPermanent(opts?: { isSuspended?: boolean }): Permanent {
  return {
    permanentId: "p-self",
    controllerSeat: 0,
    topCard: inst("self", cardId),
    stack: [],
    linked: [],
    baseDP: 14000,
    currentDP: 14000,
    isSuspended: opts?.isSuspended ?? false,
    inBreeding: false,
  } as unknown as Permanent;
}

/** A generic Digimon permanent on a given side (uses a real Green Lv.6 Digimon id). */
function digimon(permanentId: string, controllerSeat: Seat, opts?: { isSuspended?: boolean }): Permanent {
  return {
    permanentId,
    controllerSeat,
    topCard: inst(`${permanentId}-top`, "BT19-061" /* a real Digimon; only `isDigimon` matters */),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: opts?.isSuspended ?? false,
    inBreeding: false,
  } as unknown as Permanent;
}

interface Calls {
  grantKeyword: { permanentId: string; keyword: string; duration: EffectDuration }[];
  grantPierce: { permanentId: string; duration: EffectDuration }[];
  suspend: string[][];
  unsuspend: string[][];
  restrict: { permanentId: string; restriction: string; duration: EffectDuration }[];
  modifyDP: { permanentId: string; amount: number; duration: EffectDuration }[];
  forceBattle: { attackerId: string; defenderId: string }[];
}

/**
 * Fake EffectContext over a configurable board. `mineBattle`/`oppBattle` are the two
 * sides' battle areas; the chosen target of `chooseTargets` is given by `chooseAnswer`,
 * the answer to `optional` by `optionalAnswer`. Suspend mutates the fake permanent so
 * the post-suspend ownership check in the card reads the updated state.
 */
function makeCtx(args: {
  source: CardSource;
  mineBattle?: Permanent[];
  oppBattle?: Permanent[];
  chooseAnswer?: string[];
  optionalAnswer?: boolean;
}): { ctx: EffectContext; calls: Calls } {
  const calls: Calls = {
    grantKeyword: [],
    grantPierce: [],
    suspend: [],
    unsuspend: [],
    restrict: [],
    modifyDP: [],
    forceBattle: [],
  };
  const mine = args.mineBattle ?? [];
  const opp = args.oppBattle ?? [];
  const all = [...mine, ...opp];
  const byId = (id: string): Permanent | undefined => all.find((p) => p.permanentId === id);

  const ctx = {
    source: args.source,
    trigger: {},
    game: {
      player: (s: Seat) => ({ seat: s, battleArea: s === 0 ? mine : opp }) as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
      permanentById: (id: string) => byId(id),
      definitionOf: (c: CardInstance) => definitionOf(c.cardId),
    },
    fx: {
      grantKeyword: (permanentId: string, keyword: string, duration: EffectDuration) =>
        calls.grantKeyword.push({ permanentId, keyword, duration }),
      grantPierce: (permanentId: string, duration: EffectDuration) => calls.grantPierce.push({ permanentId, duration }),
      suspend: async (ids: string[]) => {
        calls.suspend.push(ids);
        for (const id of ids) {
          const p = byId(id);
          if (p !== undefined) p.isSuspended = true;
        }
        return ids;
      },
      unsuspend: (ids: string[]) => {
        calls.unsuspend.push(ids);
        for (const id of ids) {
          const p = byId(id);
          if (p !== undefined) p.isSuspended = false;
        }
      },
      restrict: (permanentId: string, restriction: string, duration: EffectDuration) =>
        calls.restrict.push({ permanentId, restriction, duration }),
      modifyDP: (permanentId: string, amount: number, duration: EffectDuration) =>
        calls.modifyDP.push({ permanentId, amount, duration }),
      forceBattle: async (attackerId: string, defenderId: string) => {
        calls.forceBattle.push({ attackerId, defenderId });
      },
    },
    ask: {
      optional: async () => args.optionalAnswer ?? true,
      chooseTargets: async () => args.chooseAnswer ?? [],
      selectCards: async () => [],
      chooseOption: async () => 0,
    },
  } as unknown as EffectContext;

  return { ctx, calls };
}

const requireModule = () => {
  const mod = getEffectModule(cardId);
  expect(mod, "EX11-074 must be registered").toBeDefined();
  return mod!;
};

function onlyEffect(timing: EffectTiming, source: CardSource) {
  const effects = requireModule().effectsForTiming(timing, source);
  expect(effects).toHaveLength(1);
  return effects[0]!;
}

describe("EX11-074 Vortexdramon", () => {
  it("production seam: another Digimon suspending triggers unsuspend-then-direct-battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "vortexdramon", dp: 14000 },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const vortexdramon = s.perm("vortexdramon");
    const ally = s.perm("ally");
    const opponent = s.perm("opponent");

    await advance(s.engine).verb.suspend([ally.permanentId], 0);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponent.permanentId), 500);

    expect(vortexdramon.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === opponent.permanentId)).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("registers a hand-written module (not the inert IR stub)", () => {
    expect(requireModule().cardId).toBe(cardId);
  });

  it("grants ＜Blocker＞, ＜Piercing＞, ＜Vortex＞ to the carrying permanent at the static window", async () => {
    const source = makeSource(selfPermanent());
    const effects = requireModule().effectsForTiming(EffectTiming.None, source);
    expect(effects.map((e) => e.effectKey).sort()).toEqual(
      [`${cardId}/blocker`, `${cardId}/piercing`, `${cardId}/vortex`].sort(),
    );
    const { ctx, calls } = makeCtx({ source });
    for (const e of effects) {
      expect(e.canTrigger(ctx)).toBe(true);
      await e.resolve(ctx);
    }
    expect(calls.grantKeyword).toEqual(
      expect.arrayContaining([
        { permanentId: "p-self", keyword: "Blocker", duration: EffectDuration.Permanent },
        { permanentId: "p-self", keyword: "Vortex", duration: EffectDuration.Permanent },
      ]),
    );
    expect(calls.grantPierce).toEqual([{ permanentId: "p-self", duration: EffectDuration.Permanent }]);
  });

  it("[When Digivolving] and [When Attacking] are both optional and present", () => {
    const source = makeSource(selfPermanent());
    const wd = onlyEffect(EffectTiming.WhenDigivolving, source);
    const wa = onlyEffect(EffectTiming.OnUseAttack, source);
    expect(wd.optional).toBe(true);
    expect(wa.optional).toBe(true);
  });

  it("suspends a YOUR Digimon -> self gains beAffected immunity + 6000 DP until opp turn end", async () => {
    const self = selfPermanent();
    const myOther = digimon("p-mine", 0);
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.WhenDigivolving, source);
    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self, myOther],
      oppBattle: [digimon("p-opp", 1)],
      chooseAnswer: ["p-mine"], // suspend my own Digimon
    });
    await eff.resolve(ctx);

    expect(calls.suspend).toEqual([["p-mine"]]);
    expect(calls.restrict).toEqual([
      { permanentId: "p-self", restriction: "beAffected", duration: EffectDuration.UntilOpponentTurnEnd },
    ]);
    expect(calls.modifyDP).toEqual([
      { permanentId: "p-self", amount: 6000, duration: EffectDuration.UntilOpponentTurnEnd },
    ]);
  });

  it("suspends an OPPONENT Digimon -> suspend happens but NO self buff (Q5948 either side; reward gated on yours)", async () => {
    const self = selfPermanent();
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.OnUseAttack, source);
    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self],
      oppBattle: [digimon("p-opp", 1)],
      chooseAnswer: ["p-opp"], // suspend the opponent's Digimon
    });
    await eff.resolve(ctx);

    expect(calls.suspend).toEqual([["p-opp"]]);
    expect(calls.restrict).toHaveLength(0);
    expect(calls.modifyDP).toHaveLength(0);
  });

  it("declining the suspend grants no reward", async () => {
    const self = selfPermanent();
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.WhenDigivolving, source);
    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self, digimon("p-mine", 0)],
      oppBattle: [digimon("p-opp", 1)],
      chooseAnswer: [], // declined (canNoSelect)
    });
    await eff.resolve(ctx);

    expect(calls.suspend).toHaveLength(0);
    expect(calls.restrict).toHaveLength(0);
    expect(calls.modifyDP).toHaveLength(0);
  });

  it("[All Turns] is Once Per Turn, may unsuspend, then may directly battle a chosen opponent Digimon", async () => {
    const self = selfPermanent({ isSuspended: true });
    const opponent = digimon("p-opp", 1);
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.OnTappedAnyone, source);
    expect(eff.maxPerTurn).toBe(1);

    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self],
      oppBattle: [opponent],
      chooseAnswer: ["p-opp"],
      optionalAnswer: true,
    });
    await expect(eff.resolve(ctx)).resolves.toBeUndefined();
    expect(calls.unsuspend).toEqual([["p-self"]]);
    expect(calls.forceBattle).toEqual([{ attackerId: "p-self", defenderId: "p-opp" }]);
  });

  it("declining the optional battle performs no direct battle", async () => {
    const self = selfPermanent();
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.OnTappedAnyone, source);
    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self],
      oppBattle: [digimon("p-opp", 1)],
      chooseAnswer: [],
    });
    await eff.resolve(ctx);
    expect(calls.forceBattle).toHaveLength(0);
  });

  it("offers only opponent Digimon as direct-battle targets", async () => {
    const self = selfPermanent();
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.OnTappedAnyone, source);
    let offered: string[] = [];
    const { ctx, calls } = makeCtx({
      source,
      mineBattle: [self, digimon("p-mine", 0)],
      oppBattle: [digimon("p-opp", 1)],
      chooseAnswer: ["p-opp"],
    });
    ctx.ask.chooseTargets = async (_ctx, options) => {
      offered = options.candidates;
      return ["p-opp"];
    };
    await eff.resolve(ctx);
    expect(offered).toEqual(["p-opp"]);
    expect(calls.forceBattle).toEqual([{ attackerId: "p-self", defenderId: "p-opp" }]);
  });

  it("[All Turns] does not unsuspend when this Digimon is already unsuspended", async () => {
    const self = selfPermanent({ isSuspended: false });
    const source = makeSource(self);
    const eff = onlyEffect(EffectTiming.OnTappedAnyone, source);
    const { ctx, calls } = makeCtx({ source, mineBattle: [self], optionalAnswer: true });
    await eff.resolve(ctx);
    expect(calls.unsuspend).toHaveLength(0);
  });
});
