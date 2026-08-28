import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-067.js";
import "./EX3-073.js";

// A3 for EX3-073 (Imperialdramon: Fighter Mode):
//   [When Digivolving] Return 1 [Dragon Mode] from digivolution stack to deck bottom;
//     disable opponent Security effects for the turn.
//   [On Deletion] Play 1 [Wormmon] and 1 [Veemon] from trash without cost.
//
// FAILS-WHEN-REVERTED: removing the On Deletion implementation removes the playInstances calls.

const DRAGON_MODE_ID = "EX3-063";
const WORMMON_ID = "EX3-055";
const VEEMON_ID = "EX3-004";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(stack: CardInstance[] = []): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX3-073",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX3-073",
      set: "EX3",
      nameEn: "Imperialdramon: Fighter Mode",
      kinds: ["Digimon"] as never,
      colors: ["Purple", "Red"] as never,
      playCost: 13,
      dp: 13000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX3-073", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack,
        linked: [] as never,
        baseDP: 13000,
        currentDP: 13000,
        isSuspended: false,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    ownerTrash?: CardInstance[];
  } = {},
): EffectContext {
  const { ownerTrash = [] } = opts;

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: ownerTrash,
    },
    {
      seat: 1 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === DRAGON_MODE_ID) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          nameEn: "Imperialdramon: Dragon Mode",
          level: 6,
          playCost: 12,
        } as never;
      }
      if (c.cardId === WORMMON_ID) {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Wormmon", level: 3, playCost: 3 } as never;
      }
      if (c.cardId === VEEMON_ID) {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Veemon", level: 3, playCost: 3 } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Other", level: 4, playCost: 4 } as never;
    },
  };

  const fx = {
    returnToDeck: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "returnToDeck", args });
      return [];
    },
    disableSecurityEffect: (...args: unknown[]) => {
      recorder.calls.push({ verb: "disableSecurityEffect", args });
    },
    disableSecurityEffectsForSeat: (...args: unknown[]) => {
      recorder.calls.push({ verb: "disableSecurityEffectsForSeat", args });
    },
    playInstances: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playInstances", args });
      return [];
    },
    grantPierce: (...args: unknown[]) => {
      recorder.calls.push({ verb: "grantPierce", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

describe("EX3-073 Imperialdramon: Fighter Mode", () => {
  const module = getEffectModule("EX3-073");

  it("matches the official identity and Secret Rare metadata", () => {
    expect(getCardDefinition("EX3-073")).toMatchObject({
      nameEn: "Imperialdramon: Fighter Mode",
      colors: ["Purple", "Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      rarity: "SEC",
      types: ["Ancient Dragonkin"],
    });
  });

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 1 None (Piercing static) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("produces 1 WhenDigivolving effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("produces 1 OnDestroyedAnyone effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });

  it("[Static] grants Piercing when on battle area", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects[0]!.canTrigger(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR has Piercing as a keyword in Static block, no grantPierce call
    const pierceCalls = recorder.calls.filter((c) => c.verb === "grantPierce");
    expect(pierceCalls).toHaveLength(1);
    expect(pierceCalls[0]!.args[1]).toBe(EffectDuration.UntilEachTurnEnd);
  });

  it("[When Digivolving] canActivate is false when no Dragon Mode in stack", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource([]); // empty stack
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[When Digivolving] returns Dragon Mode to deck bottom and disables security effects", async () => {
    const recorder: Recorder = { calls: [] };
    const dragonMode = card("dragon-1", DRAGON_MODE_ID, 0);
    const source = makeSource([dragonMode]);
    const ctx = makeCtx(recorder, source);

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects[0]!.canActivate(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: IR has this as partial, no returnToDeck or disableSecurityEffect
    const returnCalls = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(returnCalls).toHaveLength(1);
    expect((returnCalls[0]!.args[0] as string[]).includes("dragon-1")).toBe(true);
    expect(returnCalls[0]!.args[1]).toMatchObject({ toTop: false });

    const disableCalls = recorder.calls.filter((c) => c.verb === "disableSecurityEffectsForSeat");
    expect(disableCalls).toHaveLength(1);
    expect(disableCalls[0]!.args.slice(0, 2)).toEqual([0, "any"]);
  });

  it("returns the real EX3-063 from its stack and suppresses Security for every allied attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-073", under: ["EX3-063"], as: "fighterMode" },
            { card: "BT1-028", as: "ally" },
          ],
        },
        1: {
          security: [{ card: "P-067", as: "securityBulucomon" }],
          deck: ["BT1-029", "BT1-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dragonMode = s.perm("fighterMode").stack[0]!;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fighterMode"));
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === dragonMode.instanceId));

    expect(s.perm("fighterMode").stack.some(({ instanceId }) => instanceId === dragonMode.instanceId)).toBe(false);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("fighterMode"), "P-067")).toBe(true);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("ally"), "P-067")).toBe(true);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-073" && req.kind === "chooseTargets"),
    ).toHaveLength(0);

    const opponentDeckSize = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.deck).toHaveLength(opponentDeckSize);
    assertNoLoudGap(s);
  });

  it("[On Deletion] plays Wormmon and Veemon from trash", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const wormmon = card("wormmon-1", WORMMON_ID, 0);
    const veemon = card("veemon-1", VEEMON_ID, 0);
    const ctx = makeCtx(recorder, source, { ownerTrash: [wormmon, veemon] });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canActivate(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: removing this clause produces no playInstances calls.
    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls).toHaveLength(2); // 1 for Wormmon, 1 for Veemon
    for (const call of playCalls) {
      expect((call.args[1] as { payCost: boolean }).payCost).toBe(false);
    }
  });

  it("[On Deletion] plays one Wormmon and one Veemon from the real trash zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-073", as: "fighterMode" }],
          trash: [
            { card: "EX3-055", as: "wormmon" },
            { card: "EX3-004", as: "veemon" },
            { card: "BT1-028", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("fighterMode").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-055") &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-004"),
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX3-055", "EX3-004"]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-073" && req.kind === "chooseTargets"),
    ).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("[On Deletion] canActivate is false when no Wormmon or Veemon in trash", () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { ownerTrash: [] });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("[On Deletion] still plays the available species when only one is in trash", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const wormmon = card("wormmon-only", WORMMON_ID, 0);
    const ctx = makeCtx(recorder, source, { ownerTrash: [wormmon] });

    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects[0]!.canActivate(ctx)).toBe(true);
    await effects[0]!.resolve(ctx);

    const playCalls = recorder.calls.filter((c) => c.verb === "playInstances");
    expect(playCalls).toHaveLength(1);
    expect((playCalls[0]!.args[1] as { payCost: boolean }).payCost).toBe(false);
  });
});
