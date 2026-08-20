import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT18-088.js";

// A3 for BT18-088 (Takuya Kanbara & Koji Minamoto) — key testable clauses:
//
//   [Start of Your Turn] If memory <= 2, set memory to 3.
//   [Rule Text]          Also treated as [Takuya Kanbara] and [Koji Minamoto].
//   [Inherited][None]    Registers endOfTurn SubTrigger for Hybrid/Ten Warriors forced attack.
//   [Start of Main Phase] Place [Hybrid] cards from trash under self (different names, max varies).
//
// FAILS-WHEN-REVERTED:
//   - Remove [Start of Your Turn] clause → setMemory never called → memory stays 1 after OnStartTurn.
//   - Remove [Rule Text] None clause → no grantNameTrait call → name grant call count is 0.

function fakeDef(cardId: string, kind: CardKind = CardKind.Tamer): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind],
    colors: ["Red"] as never,
    playCost: 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSelfPerm(permanentId = "self-tamer"): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: { cardId: "BT18-088", instanceId: "inst-088", ownerSeat: 0 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(selfPerm: Permanent, isOwnerTurn = true): CardSource {
  return {
    instanceId: "inst-088",
    cardId: "BT18-088",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT18-088"),
    permanent: () => selfPerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => isOwnerTurn,
    hasColor: () => false,
  };
}

type Call = { verb: string; args: unknown[] };

function makeCtx(opts: {
  calls: Call[];
  selfPerm: Permanent;
  memory?: number;
  isOwnerTurn?: boolean;
}): EffectContext {
  const { calls, selfPerm, memory = 0, isOwnerTurn = true } = opts;

  const players = [
    { battleArea: [selfPerm], security: [], hand: [], deck: [], trash: [] },
    { battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory, players, turnSeat: (isOwnerTurn ? 0 : 1) as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) =>
      [...players[0]!.battleArea, ...players[1]!.battleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  } as unknown as GameAccess;

  const fx = {
    setMemory: (v: number) => { calls.push({ verb: "setMemory", args: [v] }); },
    grantNameTrait: (...a: unknown[]) => { calls.push({ verb: "grantNameTrait", args: a }); },
    subscribeSubTrigger: (...a: unknown[]) => { calls.push({ verb: "subscribeSubTrigger", args: a }); },
    modifyDP: () => {},
    gainMemory: () => {},
    placeUnder: async () => {},
    playFromSecurity: async () => {},
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, _opts) => [],
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(selfPerm, isOwnerTurn),
    trigger: {},
    game,
    fx,
    ask,
  } as unknown as EffectContext;
}

describe("BT18-088 Takuya Kanbara & Koji Minamoto", () => {
  it("[Start of Your Turn] calls setMemory(3) when memory is <= 2", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm, memory: 1 });

    const mod = getEffectModule("BT18-088");
    expect(mod).toBeDefined();
    const effects = mod!.effectsForTiming(EffectTiming.OnStartTurn, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: no OnStartTurn effect → no setMemory call.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    const setCalls = calls.filter((c) => c.verb === "setMemory");
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]!.args[0]).toBe(3);
  });

  it("[Start of Your Turn] does NOT call setMemory when memory is already 3", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm, memory: 3 });

    const mod = getEffectModule("BT18-088")!;
    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, makeSource(selfPerm));
    expect(effects.length).toBeGreaterThan(0);

    // canActivate should block when memory > 2.
    for (const eff of effects) {
      const canAct = eff.canActivate?.(ctx) ?? true;
      if (canAct) await eff.resolve(ctx);
    }

    const setCalls = calls.filter((c) => c.verb === "setMemory");
    expect(setCalls).toHaveLength(0);
  });

  it("[Rule Text][None] calls grantNameTrait with Takuya Kanbara and Koji Minamoto", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT18-088")!;
    const effects = mod.effectsForTiming(EffectTiming.None, makeSource(selfPerm));
    // FAILS-WHEN-REVERTED: remove grantNameTrait call → nameTrait grant calls are 0.
    const nameGrantEffects = effects.filter((e) => !e.isInherited);
    expect(nameGrantEffects.length).toBeGreaterThan(0);

    // Run the first non-inherited None effect (the name grant).
    await nameGrantEffects[0]!.resolve(ctx);

    const grantCalls = calls.filter((c) => c.verb === "grantNameTrait");
    expect(grantCalls).toHaveLength(1);
    // Verify Takuya Kanbara and Koji Minamoto are in the granted names.
    // grantNameTrait(permanentId, "name", [...names], duration) — names are args[2].
    const grantedNames = grantCalls[0]!.args[2] as string[];
    expect(grantedNames).toContain("Takuya Kanbara");
    expect(grantedNames).toContain("Koji Minamoto");
  });

  it("[Inherited][None] registers an endOfTurn SubTrigger for Hybrid/Ten Warriors attack", async () => {
    const calls: Call[] = [];
    const selfPerm = makeSelfPerm();
    const ctx = makeCtx({ calls, selfPerm });

    const mod = getEffectModule("BT18-088")!;
    const effects = mod.effectsForTiming(EffectTiming.None, makeSource(selfPerm));
    const inheritedEffects = effects.filter((e) => e.isInherited);
    expect(inheritedEffects.length).toBeGreaterThan(0);

    await inheritedEffects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: no subscribeSubTrigger call for "endOfTurn".
    const subCalls = calls.filter((c) => c.verb === "subscribeSubTrigger");
    expect(subCalls.length).toBeGreaterThan(0);
    const endOfTurnSub = subCalls.find(
      (c) => (c.args[0] as { event?: string })?.event === "endOfTurn",
    );
    expect(endOfTurnSub).toBeDefined();
  });
});
