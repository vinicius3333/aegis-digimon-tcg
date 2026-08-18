import { describe, it, expect } from "vitest";
import {
  EffectDuration,
  EffectTiming,
  CardKind,
  type CardDefinition,
  type CompiledCard,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { ContinuousEffectLedger } from "./continuous.js";
import { irCardModule } from "./interpreter.js";
import { getEffectModule } from "./registry.js";
import { type DecisionApi, type EffectContext, type GameAccess, type Primitives } from "./EffectContext.js";
import type { CardSource } from "./CardSource.js";

/**
 * Behavioral coverage for EX12 engine gaps #8 and #11:
 *   #8  — Effect-source-type restriction (Digimon-only immunity, EX12-019)
 *   #11 — Continuous "your effects don't affect it" immunity (EX12-052)
 *
 * Three test groups:
 *   (a) A `beAffected` entry with `fromSourceKind:["Digimon"]` blocks a Digimon-sourced
 *       check but NOT an Option-sourced check.
 *   (b) An unqualified `beAffected` entry (no `fromSourceKind`) blocks regardless of source
 *       (no regression).
 *   (c) EX12-052 and EX12-019 register without a RawUnparsed residual entry.
 */

// ---------------------------------------------------------------------------
// (a) & (b) — ContinuousEffectLedger.hasRestriction with sourceKind qualifier
// ---------------------------------------------------------------------------

describe("ContinuousEffectLedger.hasRestriction — fromSourceKind qualifier", () => {
  it("(a) qualified entry blocks when sourceKind matches", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("TARGET", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
    });
    // A Digimon-sourced effect IS blocked.
    expect(ledger.hasRestriction("TARGET", "beAffected", "Digimon")).toBe(true);
  });

  it("(a) qualified entry does NOT block when sourceKind is different", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("TARGET", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
    });
    // An Option-sourced effect passes through.
    expect(ledger.hasRestriction("TARGET", "beAffected", "Option")).toBe(false);
  });

  it("(a) qualified entry does NOT block when sourceKind is undefined (unknown source)", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("TARGET", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
    });
    // Unqualified query (no sourceKind passed) — qualified entry must not block.
    expect(ledger.hasRestriction("TARGET", "beAffected")).toBe(false);
  });

  it("(b) unqualified entry blocks regardless of sourceKind", () => {
    const ledger = new ContinuousEffectLedger();
    ledger.addRestriction("TARGET", "beAffected", EffectDuration.UntilOpponentTurnEnd);
    // No fromSourceKind => blocks everything.
    expect(ledger.hasRestriction("TARGET", "beAffected")).toBe(true);
    expect(ledger.hasRestriction("TARGET", "beAffected", "Digimon")).toBe(true);
    expect(ledger.hasRestriction("TARGET", "beAffected", "Option")).toBe(true);
    expect(ledger.hasRestriction("TARGET", "beAffected", "Tamer")).toBe(true);
  });

  it("(b) unqualified and qualified entries for the same permanent are independent", () => {
    const ledger = new ContinuousEffectLedger();
    // Qualified entry: only Digimon sources.
    ledger.addRestriction("P1", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
    });
    // Unqualified entry: all sources.
    ledger.addRestriction("P2", "beAffected", EffectDuration.UntilOpponentTurnEnd);

    // P1 — Digimon blocked, Option passes, unqualified query passes.
    expect(ledger.hasRestriction("P1", "beAffected", "Digimon")).toBe(true);
    expect(ledger.hasRestriction("P1", "beAffected", "Option")).toBe(false);
    expect(ledger.hasRestriction("P1", "beAffected")).toBe(false);

    // P2 — everything blocked.
    expect(ledger.hasRestriction("P2", "beAffected", "Digimon")).toBe(true);
    expect(ledger.hasRestriction("P2", "beAffected", "Option")).toBe(true);
    expect(ledger.hasRestriction("P2", "beAffected")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (a) Interpreter routes fromSourceKind through ctx.fx.restrict
// ---------------------------------------------------------------------------

interface DefShape {
  kinds?: string[];
  level?: number;
}
const DEFS: Record<string, DefShape> = {
  SELF: { kinds: ["Digimon"], level: 5 },
  DIGI_SRC: { kinds: ["Digimon"], level: 5 },
  OPT_SRC: { kinds: ["Option"] },
};

function def(cardId: string): CardDefinition {
  const d = DEFS[cardId] ?? { kinds: ["Digimon"] };
  return {
    cardId,
    set: "T",
    nameEn: cardId,
    kinds: (d.kinds ?? ["Digimon"]) as never,
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    level: d.level,
  };
}

function perm(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}#i`, cardId, ownerSeat: seat, faceUp: true } as never,
    stack: [],
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function source(cardId: string, p?: Permanent): CardSource {
  return {
    instanceId: "S#i",
    cardId,
    ownerSeat: 0 as Seat,
    definition: def(cardId),
    permanent: () => p,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;
}

function makeCtx(opts: {
  source: CardSource;
  own?: Permanent[];
  opponent?: Permanent[];
  ledger?: ContinuousEffectLedger;
}): { ctx: EffectContext; ledger: ContinuousEffectLedger } {
  const ledger = opts.ledger ?? new ContinuousEffectLedger();
  const players = [
    { seat: 0, battleArea: opts.own ?? [], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opts.opponent ?? [], security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => def(card.cardId),
    linkMax: () => 1,
  } as never;
  const fx: Partial<Primitives> & { restrict: Primitives["restrict"] } = {
    restrict: (permanentId, restriction, duration, restrictOpts) => {
      ledger.addRestriction(permanentId, restriction, duration, restrictOpts);
    },
  };
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return {
    ctx: { source: opts.source, trigger: {}, game, fx: fx as Primitives, ask, selections: new Map() },
    ledger,
  };
}

async function runCard(cardId: string, actions: unknown[], ctx: EffectContext, src: CardSource): Promise<void> {
  const card = { coverage: "full", residual: [], effects: [{ trigger: "Main", actions }] } as never as CompiledCard;
  const effects = irCardModule(cardId, card).effectsForTiming(EffectTiming.OnUseOption, src);
  await effects[0]!.resolve(ctx);
}

describe("Interpreter Restrict with fromSourceKind — end-to-end", () => {
  it("(a) Restrict action with fromSourceKind:['Digimon'] installs a qualified entry", async () => {
    const target = perm("T1", 0 as Seat, "SELF");
    const src = source("DIGI_SRC", target);
    const { ctx, ledger } = makeCtx({ source: src, own: [target] });

    await runCard("TEST-DIGIMON", [
      {
        kind: "Restrict",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        restriction: "beAffected",
        fromSourceKind: ["Digimon"],
        duration: "untilOpponentTurnEnd",
      },
    ], ctx, src);

    // The entry was installed.
    expect(ledger.hasRestriction("T1", "beAffected", "Digimon")).toBe(true);
    // An Option-sourced effect is NOT blocked.
    expect(ledger.hasRestriction("T1", "beAffected", "Option")).toBe(false);
  });

  it("(b) Restrict without fromSourceKind installs an unqualified entry (no regression)", async () => {
    const target = perm("T2", 0 as Seat, "SELF");
    const src = source("DIGI_SRC", target);
    const { ctx, ledger } = makeCtx({ source: src, own: [target] });

    await runCard("TEST-PLAIN", [
      {
        kind: "Restrict",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        restriction: "beAffected",
        duration: "untilOpponentTurnEnd",
      },
    ], ctx, src);

    // Blocks all sources.
    expect(ledger.hasRestriction("T2", "beAffected", "Digimon")).toBe(true);
    expect(ledger.hasRestriction("T2", "beAffected", "Option")).toBe(true);
    expect(ledger.hasRestriction("T2", "beAffected")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (c) EX12-019 and EX12-052 register without RawUnparsed in residual
// ---------------------------------------------------------------------------

// Import side effects: these trigger registerIrCard() in the module under isolate:false.
// The import must be at top level to ensure registration before tests run, but we place
// them as dynamic imports inside beforeAll to stay within the test group scope.
import "../../cards/EX12/EX12-019.js";
import "../../cards/EX12/EX12-052.js";

function fakeSrc(cardId: string): CardSource {
  return {
    instanceId: "i",
    cardId,
    ownerSeat: 0 as Seat,
    definition: def("SELF"),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;
}

describe("EX12-019 / EX12-052 registration — no RawUnparsed residual", () => {
  it("EX12-019 registers and has no RawUnparsed in any AllTurns actions", () => {
    const mod = getEffectModule("EX12-019");
    expect(mod, "EX12-019 must be registered").toBeTruthy();
    const allActions = mod!.effectsForTiming(EffectTiming.None, fakeSrc("EX12-019"))
      .flatMap((e) => (e as never as { actions: unknown[] }).actions ?? []);
    const hasRawUnparsed = allActions.some((a) => (a as { kind: string }).kind === "RawUnparsed");
    expect(hasRawUnparsed).toBe(false);
  });

  it("EX12-052 registers and no WhenDigivolving action is RawUnparsed", () => {
    const mod = getEffectModule("EX12-052");
    expect(mod, "EX12-052 must be registered").toBeTruthy();
    const digivolvingEffects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, fakeSrc("EX12-052"));
    expect(digivolvingEffects.length).toBeGreaterThan(0);
    const allActions = digivolvingEffects.flatMap(
      (e) => (e as never as { actions: unknown[] }).actions ?? [],
    );
    const hasRawUnparsed = allActions.some((a) => (a as { kind: string }).kind === "RawUnparsed");
    expect(hasRawUnparsed).toBe(false);
  });
});
