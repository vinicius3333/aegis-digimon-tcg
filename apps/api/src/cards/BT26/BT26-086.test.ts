import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-086.js";

// BT26-086 (Dantemon, BT26):
//   "<Link +6>"
//   "[On Play] [When Digivolving] You may link up to 7 [Appmon] trait cards with different
//    names from this Digimon's digivolution cards to this Digimon without paying the costs.
//    Then, this Digimon may attack without suspending."
//   "[All Turns] [Once Per Turn] When this Digimon gets linked, you may delete 1 of your
//    opponent's Digimon. Then, if this Digimon has 7 link cards, return your opponent's top
//    security card to the bottom of the deck."
//
// FAILS-WHEN-REVERTED: dropping the per-name de-duplication offers two same-named cards;
// dropping the [Appmon] filter offers any stacked card; dropping the 7-link check mills a
// security card early; dropping the subjectPermanentId gate fires the watcher when any other
// permanent gets linked.

const CARD_ID = "BT26-086";
const SELF_PERMANENT = "dantemon";

const APPMON_A = "appmon-a";
const APPMON_A_ALT = "appmon-a-alt";
const APPMON_B = "appmon-b";
const PLAIN = "plain";

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

function definitionFor(cardId: string): CardDefinition {
  switch (cardId) {
    case APPMON_A:
      return fakeDef({ cardId, nameEn: "Gatchmon", types: ["Appmon"] });
    case APPMON_A_ALT:
      // A different printing that shares the printed NAME with APPMON_A.
      return fakeDef({ cardId, nameEn: "Gatchmon", types: ["Appmon"] });
    case APPMON_B:
      return fakeDef({ cardId, nameEn: "Navimon", types: ["Appmon"] });
    default:
      return fakeDef({ cardId, nameEn: "Filler", types: ["Machine"] });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "dantemon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: SELF_PERMANENT }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  stack?: { instanceId: string; cardId: string }[];
  linked?: { instanceId: string }[];
  theirs?: { permanentId: string; topCard?: { cardId: string } }[];
  opponentSecurity?: { instanceId: string }[];
  accept?: boolean;
  pick?: (candidates: string[]) => string[];
  trigger?: Record<string, unknown>;
}) {
  const selfPermanent = {
    permanentId: SELF_PERMANENT,
    controllerSeat: 0 as Seat,
    stack: options.stack ?? [],
    linked: options.linked ?? [],
  };
  const permanents = new Map<string, unknown>([[SELF_PERMANENT, selfPermanent]]);

  const players = [
    { seat: 0 as Seat, battleArea: [selfPermanent], security: [] },
    { seat: 1 as Seat, battleArea: options.theirs ?? [], security: options.opponentSecurity ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => permanents.get(id) as never,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const grants: unknown[] = [];
  const installs: SubTriggerInstall[] = [];
  const fx = {
    link: vi.fn<(...args: any[]) => any>(async (target: string, ids: string[]) => {
      calls.push(`link:${target}:${ids.join(",")}`);
      return [];
    }),
    forceAttack: vi.fn<(...args: any[]) => any>(async (id: string, opts?: { withoutSuspending?: boolean }) => {
      calls.push(`forceAttack:${id}:${opts?.withoutSuspending === true}`);
    }),
    deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`delete:${ids.join(",")}`);
      return ids.length;
    }),
    returnToDeck: vi.fn<(...args: any[]) => any>(async (ids: string[], opts?: { toTop?: boolean }) => {
      calls.push(`returnToDeck:${ids.join(",")}:${opts?.toTop === true}`);
      return [];
    }),
    grantLinkMax: vi.fn<(...args: any[]) => any>((permanentId: string, delta: number, duration: EffectDuration) => {
      grants.push({ permanentId, delta, duration });
    }),
    subscribeSubTrigger: vi.fn<(...args: any[]) => any>((sub: SubTriggerInstall) => {
      installs.push(sub);
      return installs.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    optional: vi.fn<(...args: any[]) => any>(async () => options.accept ?? true),
    selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[]; max: number }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : opts.candidates.slice(0, opts.max);
    }),
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: options.trigger ?? {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, calls, grants, installs, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const LINK_KEY = "link-appmon-stack-then-attack";
const LINK_MAX_KEY = "link-max-bonus";
const WATCHER_KEY = "when-linked-delete-then-return-security";

describe("BT26-086 [On Play] / [When Digivolving]: link stacked Appmon, then attack unsuspended", () => {
  it("links the chosen [Appmon] stack cards, then attacks without suspending", async () => {
    const harness = makeHarness({
      stack: [
        { instanceId: "stack-a", cardId: APPMON_A },
        { instanceId: "stack-b", cardId: APPMON_B },
      ],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, LINK_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([`link:${SELF_PERMANENT}:stack-a,stack-b`, `forceAttack:${SELF_PERMANENT}:true`]);
  });

  it("offers every Appmon printing, honors the selected printing, and rejects duplicate names", async () => {
    const harness = makeHarness({
      stack: [
        { instanceId: "stack-a", cardId: APPMON_A },
        { instanceId: "stack-a-dup", cardId: APPMON_A_ALT },
        { instanceId: "stack-b", cardId: APPMON_B },
        { instanceId: "stack-plain", cardId: PLAIN },
      ],
      pick: () => ["stack-a-dup", "stack-a", "stack-b"],
      accept: false,
    });

    await effectFor(EffectTiming.OnPlay, harness.source, LINK_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["stack-a", "stack-a-dup", "stack-b"]]);
    expect(harness.calls).toEqual([`link:${SELF_PERMANENT}:stack-a-dup,stack-b`]);
  });

  it("still offers the unsuspended attack when there is nothing to link", async () => {
    const harness = makeHarness({ stack: [{ instanceId: "stack-plain", cardId: PLAIN }] });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, LINK_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([`forceAttack:${SELF_PERMANENT}:true`]);
  });

  it("still offers the independent attack when no link card is selected", async () => {
    const harness = makeHarness({ stack: [PLAIN], accept: true, select: [] });
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, harness.source)[0]!;

    await effect.resolve(harness.ctx);

    expect(harness.calls).toEqual([`forceAttack:${SELF_PERMANENT}:true`]);
  });

  it("skips the attack when the controller declines it", async () => {
    const harness = makeHarness({ stack: [{ instanceId: "stack-a", cardId: APPMON_A }], accept: false });

    await effectFor(EffectTiming.OnPlay, harness.source, LINK_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual([`link:${SELF_PERMANENT}:stack-a`]);
  });
});

describe("BT26-086 <Link +6>", () => {
  it("grants the printed link-limit bonus on the continuous ledger", async () => {
    const harness = makeHarness({});

    await effectFor(EffectTiming.None, harness.source, LINK_MAX_KEY).resolve(harness.ctx);

    expect(harness.grants).toEqual([
      { permanentId: SELF_PERMANENT, delta: 6, duration: EffectDuration.UntilEachTurnEnd },
    ]);
  });
});

describe("BT26-086 [All Turns] [Once Per Turn]: when this Digimon gets linked", () => {
  async function install(harness: ReturnType<typeof makeHarness>): Promise<SubTriggerInstall> {
    await effectFor(EffectTiming.None, harness.source, WATCHER_KEY).resolve(harness.ctx);
    expect(harness.installs).toHaveLength(1);
    return harness.installs[0]!;
  }

  it("matches only this permanent getting linked", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.matches!(makeHarness({ trigger: { subjectPermanentId: SELF_PERMANENT } }).ctx)).toBe(true);
    expect(sub.matches!(makeHarness({ trigger: { subjectPermanentId: "other" } }).ctx)).toBe(false);
    expect(sub.matches!(makeHarness({}).ctx)).toBe(false);
    expect(sub.oncePerTurnKey).toBe(`${CARD_ID}/${WATCHER_KEY}`);
  });

  it("deletes an opponent Digimon but leaves security alone below 7 link cards", async () => {
    const harness = makeHarness({
      linked: [{ instanceId: "l1" }, { instanceId: "l2" }],
      theirs: [{ permanentId: "opp-a", topCard: { cardId: PLAIN } }],
      opponentSecurity: [{ instanceId: "opp-sec-top" }, { instanceId: "opp-sec-2" }],
    });

    await (await install(harness)).run(harness.ctx);

    expect(harness.calls).toEqual(["delete:opp-a"]);
  });

  it("returns the opponent's top security card to the deck bottom at 7 link cards", async () => {
    const harness = makeHarness({
      linked: Array.from({ length: 7 }, (_, i) => ({ instanceId: `l${i}` })),
      theirs: [{ permanentId: "opp-a", topCard: { cardId: PLAIN } }],
      opponentSecurity: [{ instanceId: "opp-sec-top" }, { instanceId: "opp-sec-2" }],
    });

    await (await install(harness)).run(harness.ctx);

    expect(harness.calls).toEqual(["delete:opp-a", "returnToDeck:opp-sec-top:false"]);
  });

  it("skips the delete when declined and the security return when the stack is empty", async () => {
    const harness = makeHarness({
      linked: Array.from({ length: 7 }, (_, i) => ({ instanceId: `l${i}` })),
      theirs: [{ permanentId: "opp-a", topCard: { cardId: PLAIN } }],
      opponentSecurity: [],
      pick: () => [],
    });

    await (await install(harness)).run(harness.ctx);

    expect(harness.calls).toEqual([]);
  });
});

describe("BT26-086 evolution-stack integration", () => {
  it("links seven differently named Appmons from its stack, deletes, and bottoms top security", async () => {
    const appmons = ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "dantemon",
              under: appmons.map((card, index) => ({ card, as: `appmon-${index}` })),
            },
          ],
        },
        1: {
          deck: [{ card: "AD1-001", as: "existingDeck" }],
          security: [
            { card: "AD1-002", as: "securityTop" },
            { card: "AD1-003", as: "securityCheckedByThenAttack" },
            { card: "BT5-021", as: "securityBottom" },
          ],
          battleArea: [{ card: "AD1-004", as: "deleteTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const securityTopId = s.inst("securityTop").instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dantemon"));
    await settle(() => s.perm("dantemon").linked.length === 7);

    expect(s.perm("dantemon").linked).toHaveLength(7);
    expect(s.perm("dantemon").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("securityBottom").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("existingDeck").instanceId,
      securityTopId,
    ]);
  });
});
