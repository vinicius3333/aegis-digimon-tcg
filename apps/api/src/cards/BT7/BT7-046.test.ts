import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-088.js";
import "../BT13/BT13-007.js";
import "../BT19/BT19-085.js";
import "./BT7-046.js";
import "./BT7-089.js";

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT7-046",
    set: "BT7",
    nameEn: "Beetlemon",
    kinds: ["Digimon"] as never,
    colors: ["Green"] as never,
    playCost: 5,
    dp: 6000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#BT7046",
    cardId: "BT7-046",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

function makeContext(opts: {
  recorder: Recorder;
  deckTop5: CardInstance[];
  cardDefinitions?: Record<string, Partial<CardDefinition>>;
  battleAreaFill?: Array<{ permanentId: string; cardId: string }>;
}): EffectContext {
  const battleArea = (opts.battleAreaFill ?? []).map((p) => ({
    permanentId: p.permanentId,
    isSuspended: false,
    currentDP: 0,
    stack: [] as never[],
    topCard: fakeCardInstance(p.cardId, p.permanentId + "-top"),
  }));

  const players = [
    { seat: 0 as Seat, battleArea, security: [], hand: [], deck: [...opts.deckTop5], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const definitionOverrides: Record<string, Partial<CardDefinition>> = opts.cardDefinitions ?? {};

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => battleArea.find((p) => p.permanentId === id) as never,
    definitionOf: (card: CardInstance): CardDefinition => {
      const over = definitionOverrides[card.cardId] ?? {};
      return fakeDefinition({ cardId: card.cardId, ...over });
    },
  };

  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      opts.recorder.calls.push({ verb, args });
      return [] as never;
    };

  const fx = {
    reveal: async (_seat: Seat, n: number): Promise<CardInstance[]> => {
      opts.recorder.calls.push({ verb: "reveal", args: [_seat, n] });
      return opts.deckTop5.slice(0, n);
    },
    returnToHand: record("returnToHand"),
    returnToDeck: record("returnToDeck"),
    draw: (...a: unknown[]) => {
      throw new Error(`Unexpected draw(${JSON.stringify(a)})`);
    },
    gainMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected gainMemory(${JSON.stringify(a)})`);
    },
    setMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected setMemory(${JSON.stringify(a)})`);
    },
    trash: (...a: unknown[]) => {
      throw new Error(`Unexpected trash(${JSON.stringify(a)})`);
    },
    deletePermanent: (...a: unknown[]) => {
      throw new Error(`Unexpected deletePermanent(${JSON.stringify(a)})`);
    },
    suspend: (...a: unknown[]) => {
      throw new Error(`Unexpected suspend(${JSON.stringify(a)})`);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("BT7-046 Beetlemon [When Digivolving]", () => {
  const module = getEffectModule("BT7-046");

  it("digivolves onto a green Tamer and resolves both reveal picks through public game state", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: [
            "BT7-007",
            { card: "BT7-047", as: "hybrid" },
            { card: "BT7-089", as: "searchedJp" },
            "BT7-012",
            "BT7-020",
            "BT7-048",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const hybridId = s.inst("hybrid").instanceId;
    const jpId = s.inst("searchedJp").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => [hybridId, jpId].every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(s.state.memory).toBe(0);
    expect(s.perm("jp").topCard.cardId).toBe("BT7-046");
    expect(s.perm("jp").stack).toHaveLength(1);
    expect(player.hand.some((card) => card.instanceId === hybridId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === jpId)).toBe(true);
    expect(player.deck).toHaveLength(3);
  });

  it("registers on import", () => {
    expect(module, "BT7-046 must self-register on import").toBeDefined();
  });

  it("routes to WhenDigivolving and nothing else", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
  });

  it("reveals exactly 5 cards regardless of field state (Q1579: no youHave gate)", async () => {
    const deckCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
      fakeCardInstance("C5", "i5"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, deckTop5: deckCards });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const reveals = recorder.calls.filter((c) => c.verb === "reveal");
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.args[1]).toBe(5);
  });

  it("adds a Hybrid-trait card to hand when one is revealed (Q1579: independent add specs)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-hybrid");
  });

  it("adds J.P. Shibayama to hand when one is revealed (Q1579: independent add specs)", async () => {
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [
      fakeCardInstance("C1", "i1"),
      fakeCardInstance("C2", "i2"),
      fakeCardInstance("C3", "i3"),
      fakeCardInstance("C4", "i4"),
    ];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [jpCard, ...plainCards],
      cardDefinitions: {
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const handedIds = recorder.calls.filter((c) => c.verb === "returnToHand").flatMap((c) => c.args[0] as string[]);
    expect(handedIds).toContain("i-jp");
  });

  it("sends unreturned revealed cards to deck bottom (Q1579: remaining cards placement)", async () => {
    const hybridCard = fakeCardInstance("BT1-XXX", "i-hybrid");
    const jpCard = fakeCardInstance("BT7-087", "i-jp");
    const plainCards = [fakeCardInstance("C1", "i1"), fakeCardInstance("C2", "i2"), fakeCardInstance("C3", "i3")];
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      deckTop5: [hybridCard, jpCard, ...plainCards],
      cardDefinitions: {
        "BT1-XXX": { nameEn: "Agunimon", types: ["Hybrid"], kinds: ["Digimon"] as never },
        "BT7-087": { nameEn: "J.P. Shibayama", kinds: ["Tamer"] as never },
      },
    });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const deckReturns = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(deckReturns.length).toBeGreaterThanOrEqual(1);
    const deckIds = deckReturns.flatMap((c) => c.args[0] as string[]);
    for (const plain of plainCards) {
      expect(deckIds).toContain(plain.instanceId);
    }
    for (const call of deckReturns) {
      const opts = call.args[1] as { toTop?: boolean } | undefined;
      expect(opts?.toTop).toBeFalsy();
    }
  });

  it("IR description contains only RevealAdd — no spurious Return actions (runtime record bug)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects).toHaveLength(1);
    const desc = (effects[0] as unknown as { description?: string }).description ?? "";
    expect(desc).not.toMatch(/Return/);
  });
});

describe("BT7-046 Beetlemon — KB Q&A rulings", () => {
  const fillerDeck = ["BT1-020", "BT1-019", "BT7-020", "BT7-048", "BT7-012", "BT1-020"];

  const digivolveBeetlemonOnto = (s: EngineSetup, tamerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst("beetlemon").instanceId,
    });

  const awaitTopCard = (s: EngineSetup, alias: string, cardId: string) =>
    settle(() => s.perm(alias).topCard?.cardId === cardId && s.state.pendingDecision === undefined);

  const attack = (s: EngineSetup, attackerAlias: string, target: { kind: "player" } | { alias: string }) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: "alias" in target ? { kind: "permanent", permanentId: s.perm(target.alias).permanentId } : target,
    });

  it("treats the Tamer as a digivolving Digimon for digivolve triggers and can't-digivolve effects (Q1572)", async () => {
    const blocked = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          breeding: "BT13-007",
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    blocked.state.memory = 3;
    await blocked.ready();

    expect(digivolveBeetlemonOnto(blocked, "jp")).toMatchObject({ ok: false });
    expect(blocked.perm("jp").topCard!.cardId).toBe("BT7-089");
    expect(blocked.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-046"]);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-089", as: "jp" },
            { card: "BT19-085", as: "henry" },
          ],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
        1: { battleArea: [{ card: "BT7-020", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    await settle();
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves into it (Q1573)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: [{ card: "BT7-007", as: "drawn" }, "BT1-020", "BT1-019", "BT7-020", "BT7-048", "BT7-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0]!;
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 3;

    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    await settle(() => player.deck.length === 5);

    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([drawnId]);
    expect(player.deck.some(({ instanceId }) => instanceId === drawnId)).toBe(false);
  });

  it("can't attack the turn it digivolves from a Tamer played that turn (Q1574)", async () => {
    const buildBoard = (tamerEnteredThisTurn: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-089", as: "jp", enteredThisTurn: tamerEnteredThisTurn }],
            hand: [{ card: "BT7-046", as: "beetlemon" }],
            deck: fillerDeck,
          },
          1: { security: ["BT7-007", "BT7-007"] },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );

    const s = buildBoard(true);
    s.state.memory = 3;
    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    expect(attack(s, "jp", { kind: "player" })).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(2);

    const control = buildBoard(false);
    control.state.memory = 3;
    expect(digivolveBeetlemonOnto(control, "jp")).toEqual({ ok: true });
    await awaitTopCard(control, "jp", "BT7-046");
    expect(attack(control, "jp", { kind: "player" })).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1575)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
        1: { battleArea: [{ card: "BT7-012", as: "wall", suspended: true }] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0]!;
    const tamerCardId = s.perm("jp").topCard!.instanceId;
    s.state.memory = 3;

    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    expect(s.perm("jp").stack.map(({ instanceId }) => instanceId)).toEqual([tamerCardId]);

    expect(attack(s, "jp", { alias: "wall" })).toEqual({ ok: true });
    await settle(() => player.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(player.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT7-046", "BT7-089"]);
    expect(player.trash.some(({ instanceId }) => instanceId === tamerCardId)).toBe(true);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q1576)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
        1: { security: [{ card: "BT7-007", as: "checked" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0]!;
    const checkedId = s.inst("checked").instanceId;
    s.state.memory = 3;

    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    expect(attack(s, "jp", { kind: "player" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === checkedId) &&
        s.state.pendingDecision === undefined,
    );

    expect(player.battleArea).toHaveLength(1);
    expect(s.perm("jp").topCard!.cardId).toBe("BT7-046");
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toEqual(["BT7-089"]);

    const control = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-046", as: "attacker" }] },
        1: { security: [{ card: "BT7-089", as: "securityJp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    expect(attack(control, "attacker", { kind: "player" })).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT7-089"));
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q1577)", async () => {
    const buildBoard = (tamerCardId: string) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: tamerCardId, as: "tamer" }],
            hand: [{ card: "BT7-046", as: "beetlemon" }],
            deck: fillerDeck,
          },
          1: { battleArea: [{ card: "BT7-007", as: "victim", suspended: true }], security: ["BT1-020"] },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
    const attackAndDelete = async (s: EngineSetup) => {
      const victimId = s.perm("victim").topCard!.instanceId;
      s.state.memory = 3;
      expect(digivolveBeetlemonOnto(s, "tamer")).toEqual({ ok: true });
      await awaitTopCard(s, "tamer", "BT7-046");
      expect(attack(s, "tamer", { alias: "victim" })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.trash.some(({ instanceId }) => instanceId === victimId) &&
          s.state.pendingDecision === undefined,
      );
      await settle();
    };

    const withJp = buildBoard("BT7-089");
    await attackAndDelete(withJp);
    expect(withJp.state.players[1]!.security).toHaveLength(0);

    const withoutPiercingSource = buildBoard("BT1-088");
    await attackAndDelete(withoutPiercingSource);
    expect(withoutPiercingSource.state.players[1]!.security).toHaveLength(1);
  });

  it("must digivolve once declared onto a green Tamer, and can't be declared without a valid base (Q4645)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveBeetlemonOnto(s, "jp")).toEqual({ ok: true });
    await awaitTopCard(s, "jp", "BT7-046");
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toEqual(["BT7-089"]);
    // Cost 2, reduced by 1 by J.P. Shibayama's own [Your Turn] effect.
    expect(s.state.memory).toBe(2);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);

    const noValidBase = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "redTamer" }],
          hand: [{ card: "BT7-046", as: "beetlemon" }],
          deck: fillerDeck,
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    noValidBase.state.memory = 3;
    await noValidBase.ready();

    expect(digivolveBeetlemonOnto(noValidBase, "redTamer")).toMatchObject({ ok: false });
    expect(noValidBase.perm("redTamer").topCard!.cardId).toBe("BT1-085");
    expect(noValidBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-046"]);
    expect(noValidBase.state.memory).toBe(3);
  });
});
