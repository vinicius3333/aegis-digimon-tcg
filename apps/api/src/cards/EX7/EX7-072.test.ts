import { describe, it, expect } from "vitest";
import { CardKind, CardColor, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX7-072.js";
import { compiled } from "./EX7-072.js";

// A3 for EX7-072 (Seventh Fascination) — Purple Option.
// [Security] Delete 1 of your opponent's unsuspended Digimon.
// [Main] All your opponent's Digimon gain "[End of Your Turn] Delete 1 of your
//   Digimon." until end of their turn.
// [Trash] [Your Turn] When your Digimon digivolves into [Lilithmon (X Antibody)], by
//   returning this card to the bottom of the deck, activate this card's [Main] effect.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function digimonDef(cardId: string): CardDefinition {
  return {
    cardId,
    set: "EX7",
    nameEn: `Digi-${cardId}`,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Purple],
    playCost: 5,
    dp: 5000,
    level: 4,
    types: [],
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function optionDef(): CardDefinition {
  return {
    cardId: "EX7-072",
    set: "EX7",
    nameEn: "Seventh Fascination",
    kinds: [CardKind.Option],
    colors: [CardColor.Purple],
    playCost: 5,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

let instanceSequence = 0;
function inst(cardId: string, seat: Seat = 0) {
  return { instanceId: `inst-${++instanceSequence}`, cardId, ownerSeat: seat, faceUp: true };
}

function makeSource(): CardSource {
  return {
    instanceId: "EX7-072-INST",
    cardId: "EX7-072",
    ownerSeat: 0 as Seat,
    definition: optionDef(),
    permanent: () => undefined as never,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: (c) => c === CardColor.Purple,
  };
}

function makePermanent(id: string, cardId: string, seat: Seat, isSuspended: boolean) {
  return {
    permanentId: id,
    topCard: inst(cardId, seat),
    isSuspended,
    inBreeding: false,
    stack: [],
    controllerSeat: seat,
    currentDP: 5000,
  };
}

function makeCtx(opts: { recorder: Recorder; oppPerms: ReturnType<typeof makePermanent>[] }): EffectContext {
  const { recorder, oppPerms } = opts;

  const defMap = new Map<string, CardDefinition>();
  defMap.set("EX7-072", optionDef());
  for (const p of oppPerms) {
    if (p.topCard) defMap.set(p.topCard.cardId, digimonDef(p.topCard.cardId));
  }

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      hand: [],
      deck: [],
      trash: [{ ...inst("EX7-072"), instanceId: "EX7-072-INST" }],
      security: [],
    },
    { seat: 1 as Seat, battleArea: oppPerms, hand: [], deck: [], trash: [], security: [] },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id) => oppPerms.find((p) => p.permanentId === id) as never,
    definitionOf: (card) => defMap.get(card.cardId) ?? digimonDef(card.cardId),
  };

  const fx = {
    deletePermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return 1;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source: makeSource(),
    trigger: {},
    game,
    fx,
    ask,
  };
}

describe("EX7-072 Seventh Fascination", () => {
  const module = getEffectModule("EX7-072");

  it("is registered", () => {
    expect(module).toBeDefined();
  });

  it("routes [Security] to SecuritySkill timing", () => {
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource()).length).toBeGreaterThanOrEqual(1);
  });

  it("returns no effects for non-security timings", () => {
    expect(module!.effectsForTiming(EffectTiming.OnPlay, makeSource()).length).toBe(0);
    expect(module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, makeSource()).length).toBe(0);
  });

  it("[Security] deletes an unsuspended opponent Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const oppPerms = [makePermanent("OPP-1", "OPP-DIGI-1", 1 as Seat, false)];
    const ctx = makeCtx({ recorder, oppPerms });
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource());

    await effects[0]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0]!.args[0] as string[]).toContain("OPP-1");
  });

  it("[Security] does NOT delete a suspended opponent Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const oppPerms = [makePermanent("OPP-SUSP", "OPP-DIGI-SUSP", 1 as Seat, true)];
    const ctx = makeCtx({ recorder, oppPerms });
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource());

    await effects[0]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls.length).toBe(0);
  });

  it("[Security] only deletes unsuspended Digimon when both types are present", async () => {
    const recorder: Recorder = { calls: [] };
    const oppPerms = [
      makePermanent("OPP-ACTIVE", "OPP-DIGI-A", 1 as Seat, false),
      makePermanent("OPP-SUSP", "OPP-DIGI-S", 1 as Seat, true),
    ];
    const ctx = makeCtx({ recorder, oppPerms });
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, makeSource());

    await effects[0]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0]!.args[0] as string[]).toContain("OPP-ACTIVE");
    expect(deleteCalls[0]!.args[0] as string[]).not.toContain("OPP-SUSP");
  });
});

describe("EX7-072 public Trash digivolution trigger", () => {
  it("returns itself to deck bottom and activates Main on an exact Lilithmon (X Antibody) digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          trash: [{ card: "EX7-072", as: "option" }],
          hand: [{ card: "EX7-061", as: "lilithmonXa" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithmonXa").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.cardId === "EX7-072"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-072")).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("EX7-072");
  });

  it("does not trigger for the near-name Lilithmon card without X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          trash: [{ card: "EX7-072", as: "option" }],
          hand: [{ card: "BT11-087", as: "lilithmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT11-087");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-072")).toBe(true);
  });
});

describe("EX7-072 [Main] grants a delayed self-delete choice to every opponent Digimon", () => {
  const module = getEffectModule("EX7-072");

  it("routes [Main] to OnUseOption timing", () => {
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, makeSource()).length).toBe(1);
  });

  it("installs 1 subscribeSubTrigger('endOfOpponentTurn') per opponent Digimon present at resolution", async () => {
    const oppPerms = [
      makePermanent("OPP-1", "OPP-DIGI-1", 1 as Seat, false),
      makePermanent("OPP-2", "OPP-DIGI-2", 1 as Seat, false),
    ];
    const recorder: Recorder = { calls: [] };
    const subCalls: unknown[] = [];
    const ctx = makeCtx({ recorder, oppPerms });
    (ctx.fx as unknown as Primitives).subscribeSubTrigger = ((sub: unknown) => {
      subCalls.push(sub);
      return 0;
    }) as never;

    const effect = module!.effectsForTiming(EffectTiming.OnUseOption, makeSource())[0]!;
    await effect.resolve(ctx);

    expect(subCalls).toHaveLength(2);
    const subs = subCalls as { event: string; sourcePermanentId: string; once: boolean; expiresOnTurnEndOf: Seat }[];
    expect(subs.every((s) => s.event === "endOfOpponentTurn")).toBe(true);
    expect(subs.every((s) => s.once === true)).toBe(true);
    expect(subs.every((s) => s.expiresOnTurnEndOf === 1)).toBe(true);
    expect(subs.map((s) => s.sourcePermanentId).sort()).toEqual(["OPP-1", "OPP-2"]);
  });

  it("publicly deletes each watched opponent Digimon at the end of that opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-072", as: "option" }],
          battleArea: [{ card: "EX7-061", as: "purpleSource" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(observe(s.engine).subscriptions("endOfOpponentTurn")).toHaveLength(2);

    s.state.turnSeat = 1;
    const opponentTurn = advance(s.engine).runTurn(1);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("the granted watcher's run() asks the OPPONENT (not this card's owner) to choose and delete 1 of their Digimon", async () => {
    const oppPerms = [makePermanent("OPP-1", "OPP-DIGI-1", 1 as Seat, false)];
    const recorder: Recorder = { calls: [] };
    let capturedRun: ((ctx: EffectContext) => Promise<void>) | undefined;
    const ctx = makeCtx({ recorder, oppPerms });
    (ctx.fx as unknown as Primitives).subscribeSubTrigger = ((sub: { run: (c: EffectContext) => Promise<void> }) => {
      capturedRun = sub.run;
      return 0;
    }) as never;

    const effect = module!.effectsForTiming(EffectTiming.OnUseOption, makeSource())[0]!;
    await effect.resolve(ctx);
    expect(capturedRun).toBeDefined();

    let opponentAskCalled = false;
    let ownerAskCalled = false;
    const subCtx: EffectContext = {
      ...ctx,
      trigger: {},
      ask: {
        ...ctx.ask,
        chooseTargets: async (_c, o) => {
          ownerAskCalled = true;
          return o.candidates.slice(0, o.max);
        },
        opponent: {
          optional: async () => true,
          chooseTargets: async (_c, o) => {
            opponentAskCalled = true;
            return o.candidates.slice(0, 1);
          },
          selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
          selectCards: async (_c, o) => o.candidates.slice(0, o.max),
          chooseOption: async () => 0,
        },
      },
    };

    await capturedRun!(subCtx);

    expect(opponentAskCalled).toBe(false);
    expect(ownerAskCalled).toBe(false);
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedActions: [{ kind: "Delete", target: { chooser: "opponent" } }],
    });
  });
});

describe("EX7-072 [Trash][Your Turn] watches for a digivolve into [Lilithmon (X Antibody)]", () => {
  const module = getEffectModule("EX7-072");

  it("routes the [Trash] clause to EffectTiming.None", () => {
    expect(module!.effectsForTiming(EffectTiming.None, makeSource()).length).toBe(1);
  });

  it("installs an anchor-less subscribeSubTrigger('whenOneOfYoursDigivolves') via sourceInstanceId", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppPerms: [] });
    const subCalls: { event: string; sourceInstanceId?: string; sourcePermanentId?: string }[] = [];
    (ctx.fx as unknown as Primitives).subscribeSubTrigger = ((sub: {
      event: string;
      sourceInstanceId?: string;
      sourcePermanentId?: string;
    }) => {
      subCalls.push(sub);
      return 0;
    }) as never;

    const effect = module!.effectsForTiming(EffectTiming.None, makeSource())[0]!;
    await effect.resolve(ctx);

    expect(subCalls).toHaveLength(1);
    expect(subCalls[0]!.event).toBe("whenOneOfYoursDigivolves");
    expect(subCalls[0]!.sourceInstanceId).toBe("EX7-072-INST");
    expect(subCalls[0]!.sourcePermanentId).toBeUndefined();
  });

  it("matches() only fires for the OWNER's Digimon digivolving into exactly [Lilithmon (X Antibody)]", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppPerms: [] });
    let capturedMatches: ((c: EffectContext) => boolean) | undefined;
    (ctx.fx as unknown as Primitives).subscribeSubTrigger = ((sub: { matches: (c: EffectContext) => boolean }) => {
      capturedMatches = sub.matches;
      return 0;
    }) as never;

    const effect = module!.effectsForTiming(EffectTiming.None, makeSource())[0]!;
    await effect.resolve(ctx);
    expect(capturedMatches).toBeDefined();

    const lilithmonXaPerm = makePermanent("HOST", "EX7-061", 0 as Seat, false);
    const defMap = new Map<string, CardDefinition>([
      ["EX7-061", { ...digimonDef("EX7-061"), nameEn: "Lilithmon (X Antibody)" }],
    ]);
    const opponentsPerm = makePermanent("OPP-HOST", "EX7-061", 1 as Seat, false);
    const otherDigimonPerm = makePermanent("OTHER", "SOME-OTHER", 0 as Seat, false);

    const makeSubCtx = (perm: typeof lilithmonXaPerm): EffectContext => ({
      ...ctx,
      trigger: { subjectPermanentId: perm.permanentId },
      game: {
        ...ctx.game,
        permanentById: (id: string) =>
          [lilithmonXaPerm, opponentsPerm, otherDigimonPerm].find((p) => p.permanentId === id) as never,
        definitionOf: (card) => defMap.get(card.cardId) ?? digimonDef(card.cardId),
      },
    });

    expect(capturedMatches!(makeSubCtx(lilithmonXaPerm))).toBe(true);
    // Opponent's own digivolve into Lilithmon (X Antibody) doesn't qualify ("your Digimon").
    expect(capturedMatches!(makeSubCtx(opponentsPerm))).toBe(false);
    // The owner's OTHER Digimon digivolving (not into Lilithmon (X Antibody)) doesn't qualify.
    expect(capturedMatches!(makeSubCtx(otherDigimonPerm))).toBe(false);
  });

  it("run() pays the cost (returns self to bottom of deck) then activates [Main] (grants the opponent's Digimon)", async () => {
    const oppPerms = [makePermanent("OPP-1", "OPP-DIGI-1", 1 as Seat, false)];
    const recorder: Recorder = { calls: [] };
    const ctx = makeCtx({ recorder, oppPerms });
    let capturedRun: ((c: EffectContext) => Promise<void>) | undefined;
    const outerSubCalls: unknown[] = [];
    (ctx.fx as unknown as Primitives).subscribeSubTrigger = ((sub: { run: (c: EffectContext) => Promise<void> }) => {
      if (capturedRun === undefined) capturedRun = sub.run;
      outerSubCalls.push(sub);
      return 0;
    }) as never;
    (ctx.fx as unknown as Primitives).returnToDeck = (async (...args: unknown[]) => {
      recorder.calls.push({ verb: "returnToDeck", args });
      return [];
    }) as never;

    const effect = module!.effectsForTiming(EffectTiming.None, makeSource())[0]!;
    await effect.resolve(ctx);
    expect(capturedRun).toBeDefined();

    const nestedSubCalls: unknown[] = [];
    const subCtx: EffectContext = {
      ...ctx,
      trigger: { subjectPermanentId: "HOST" },
      fx: {
        ...ctx.fx,
        returnToDeck: async (...args: unknown[]) => {
          recorder.calls.push({ verb: "returnToDeck", args });
          return [];
        },
        subscribeSubTrigger: ((sub: unknown) => {
          nestedSubCalls.push(sub);
          return 0;
        }) as never,
      } as unknown as Primitives,
    };

    await capturedRun!(subCtx);

    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(returnCalls).toHaveLength(1);
    expect(returnCalls[0]!.args[0]).toEqual(["EX7-072-INST"]);

    // [Main] then grants the "endOfOpponentTurn" watcher onto OPP-1.
    expect(nestedSubCalls).toHaveLength(1);
    expect((nestedSubCalls[0] as { event: string }).event).toBe("endOfOpponentTurn");
    expect((nestedSubCalls[0] as { sourcePermanentId: string }).sourcePermanentId).toBe("OPP-1");
  });
});
