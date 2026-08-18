import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import module from "./BT1-103.js";

// A3 for BT1-103 (Testament):
//   [Main] Until the end of your opponent's next turn, 1 of your Digimon gains ＜Blocker＞.
//   [Security] Trigger ＜Draw 1＞. Then, add this card to your hand.
//
// FAILS-WHEN-REVERTED: the declarative effect stub fires GainKeyword at OnPlay (via
// the interpreter's generic handler), never at OnUseOption, and the [Security] effect
// uses an inert legacy parser fallback for Draw 1 (no draw call). The hand-written module is the only
// path that calls ctx.fx.grantKeyword at OnUseOption timing AND ctx.fx.draw in the
// security body. Both assertions here are unreachable through the IR stub.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT1-103",
    set: "BT1",
    nameEn: "Testament",
    kinds: ["Option"] as never,
    colors: ["Yellow"] as never,
    playCost: 5,
    dp: 0,
    level: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function digimonDefinition(cardId: string): CardDefinition {
  return {
    cardId,
    set: "BT1",
    nameEn: "Digimon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 3,
    dp: 2000,
    level: 3,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(opts: { instanceId?: string } = {}): CardSource {
  return {
    instanceId: opts.instanceId ?? "testament-inst",
    cardId: "BT1-103",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined as never,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type BattleAreaPermanent = {
  permanentId: string;
  topCard: { instanceId: string; cardId: string; ownerSeat: Seat; faceUp: boolean };
  inBreeding: boolean;
};

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  battleArea?: BattleAreaPermanent[];
}): EffectContext {
  const rec = opts.recorder;
  const battleArea = opts.battleArea ?? [];

  const players = [
    { seat: 0 as Seat, battleArea, hand: [], deck: [], trash: [], security: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], deck: [], trash: [], security: [] },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      if (card.cardId === "BT1-103") return fakeDefinition();
      return digimonDefinition(card.cardId);
    },
  };

  const fx = {
    grantKeyword: (...args: unknown[]) => {
      rec.calls.push({ verb: "grantKeyword", args });
    },
    draw: async (...args: unknown[]) => {
      rec.calls.push({ verb: "draw", args });
      return [] as never;
    },
    returnToHand: async (...args: unknown[]) => {
      rec.calls.push({ verb: "returnToHand", args });
      return [] as never;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: opts.source, trigger: {}, game, fx, ask };
}

describe("BT1-103 Testament", () => {
  it("matches its official Option and Security text", () => {
    expect(getCardDefinition("BT1-103")).toMatchObject({
      nameEn: "Testament",
      colors: ["Yellow"],
      playCost: 3,
      effectText: expect.stringContaining("gains ＜Blocker＞"),
      securityEffectText: expect.stringContaining("Trigger <Draw 1＞"),
    });
  });

  it("is registered on import", () => {
    expect(module.cardId).toBe("BT1-103");
  });

  it("produces an OnUseOption effect", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("produces a SecuritySkill effect", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("produces no effects for OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("[Main] canActivate is false when owner has no Digimon on battle area", () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source, battleArea: [] });
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[Main] canActivate is true when owner has a Digimon on battle area", () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const battleArea: BattleAreaPermanent[] = [
      {
        permanentId: "perm-1",
        topCard: { instanceId: "digi-inst-1", cardId: "BT1-001", ownerSeat: 0 as Seat, faceUp: true },
        inBreeding: false,
      },
    ];
    const ctx = makeContext({ recorder, source, battleArea });
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects[0]!.canActivate(ctx)).toBe(true);
  });

  it("[Main] calls grantKeyword with Blocker + UntilOpponentTurnEnd on the chosen permanent", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const battleArea: BattleAreaPermanent[] = [
      {
        permanentId: "perm-1",
        topCard: { instanceId: "digi-inst-1", cardId: "BT1-001", ownerSeat: 0 as Seat, faceUp: true },
        inBreeding: false,
      },
    ];
    const ctx = makeContext({ recorder, source, battleArea });
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR stub dispatches GainKeyword at OnPlay, not here at
    // OnUseOption, so grantKeyword is never called through this resolve path.
    const grantCalls = recorder.calls.filter((c) => c.verb === "grantKeyword");
    expect(grantCalls).toHaveLength(1);
    expect(grantCalls[0]!.args[0]).toBe("perm-1");
    expect(grantCalls[0]!.args[1]).toBe("Blocker");
    expect(grantCalls[0]!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
  });

  it("[Main] does nothing when battle area has no Digimon (empty candidates guard)", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source, battleArea: [] });
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(0);
  });

  it("[Security] draws 1 card then calls returnToHand with its own instanceId", async () => {
    const source = makeSource({ instanceId: "testament-security" });
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, source });
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: the IR stub has an inert Draw 1 fallback — no draw call fires.
    const drawCalls = recorder.calls.filter((c) => c.verb === "draw");
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]!.args[0]).toBe(0 as Seat); // ownerSeat
    expect(drawCalls[0]!.args[1]).toBe(1); // draw count

    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToHand");
    expect(returnCalls).toHaveLength(1);
    expect((returnCalls[0]!.args[0] as string[]).includes("testament-security")).toBe(true);
  });
});
