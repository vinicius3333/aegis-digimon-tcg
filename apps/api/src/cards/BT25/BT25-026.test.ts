import { describe, it, expect, beforeEach } from "vitest";
import {
  CardColor,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled as BT25_026 } from "./BT25-026.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

let seq = 0;

function makeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X-000",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 3000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(over: Partial<Permanent> & { cardId?: string }): Permanent {
  seq += 1;
  const cardId = over.cardId ?? "X-000";
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: `i-${seq}`, cardId, ownerSeat: 0 as Seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as unknown as Permanent;
}

function makeSource(selfPermanent: Permanent): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "BT25-026",
    ownerSeat: 0 as Seat,
    definition: makeDefinition({ cardId: "BT25-026", colors: [CardColor.Blue] }),
    permanent: () => selfPermanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Harness {
  installs: SubTriggerInstall[];
  digivolveCalls: number;
  ctx: EffectContext;
  /** Build a freshly bound sub-context for a fired event whose subject is `subjectId`. */
  subCtxFor(subjectId: string): EffectContext;
}

const RED_DIGIMON = "DIG-RED";
const OPPONENT_RED_DIGIMON = "DIG-OPPONENT-RED";
const BLUE_DIGIMON = "DIG-BLUE";
const DIANAMON = "DIANAMON";

function makeHarness(turnSeat: Seat): Harness {
  seq = 0;
  const self = makePermanent({ cardId: "BT25-026", controllerSeat: 0 as Seat });
  const redSubject = makePermanent({ permanentId: "subj-red", cardId: RED_DIGIMON, controllerSeat: 0 as Seat });
  const blueSubject = makePermanent({ permanentId: "subj-blue", cardId: BLUE_DIGIMON, controllerSeat: 0 as Seat });
  const opponentRedSubject = makePermanent({
    permanentId: "subj-opponent-red",
    cardId: OPPONENT_RED_DIGIMON,
    controllerSeat: 1 as Seat,
  });
  const byId: Record<string, Permanent> = {
    [self.permanentId]: self,
    "subj-red": redSubject,
    "subj-blue": blueSubject,
    "subj-opponent-red": opponentRedSubject,
  };
  const colorsByCard: Record<string, CardColor[]> = {
    [RED_DIGIMON]: [CardColor.Red],
    [OPPONENT_RED_DIGIMON]: [CardColor.Red],
    [BLUE_DIGIMON]: [CardColor.Blue],
    [DIANAMON]: [CardColor.Blue],
    "BT25-026": [CardColor.Blue],
  };
  const players = [
    {
      seat: 0,
      battleArea: [self, redSubject, blueSubject],
      security: [],
      hand: [],
      deck: [],
      // A [Dianamon] in trash so the digivolve has a source to find.
      trash: [{ instanceId: "t-dianamon", cardId: DIANAMON, ownerSeat: 0 as Seat, faceUp: false }],
    },
    { seat: 1, battleArea: [opponentRedSubject], security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat } as never,
    player: (s: Seat) => players[s] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => byId[id],
    definitionOf: (card) =>
      makeDefinition({
        cardId: card.cardId,
        nameEn: card.cardId === DIANAMON ? "Dianamon" : card.cardId,
        level: card.cardId === DIANAMON ? 6 : 5,
        colors: colorsByCard[card.cardId] ?? [],
        evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }] as never,
      }),
    linkMax: () => 1,
  };
  const harness: Harness = {
    installs: [],
    digivolveCalls: 0,
    ctx: undefined as never,
    subCtxFor: undefined as never,
  };
  const fx = {
    subscribeSubTrigger: (install: SubTriggerInstall) => {
      harness.installs.push(install);
      return harness.installs.length;
    },
    digivolveFromInstance: async () => {
      harness.digivolveCalls += 1;
      return makePermanent({ cardId: DIANAMON });
    },
    // The inherited [Restrict attackTargetChange] effect also resolves at EffectTiming.None;
    // no-op it so installing the [Your Turn] watchers does not throw.
    restrict: () => {},
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  const baseCtx = (): EffectContext => ({
    source: makeSource(self),
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map<string, string>(),
  });
  harness.ctx = baseCtx();
  harness.subCtxFor = (subjectId: string) => {
    const c = baseCtx();
    c.trigger = { subjectPermanentId: subjectId };
    return c;
  };
  return harness;
}

/** Subscribe the card's [Your Turn] SubTrigger watchers through the REAL interpreter. */
async function installWatchers(h: Harness): Promise<void> {
  const module = getEffectModule("BT25-026")!;
  const effects = module.effectsForTiming(EffectTiming.None, h.ctx.source);
  // The [Your Turn] SubTrigger effects live in the continuous/static window (EffectTiming.None);
  // resolve every one so each SubTrigger watcher is installed.
  for (const e of effects) await e.resolve(h.ctx);
}

describe("BT25-026 — SubTrigger fire-time source-color gate", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("installs play + digivolve watchers each gated on a red, your-turn subject", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const colorGated = h.installs.filter((i) => i.matches !== undefined);
    expect(colorGated.length).toBeGreaterThanOrEqual(2);

    const effect = BT25_026.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)!;
    const watchers = effect.actions.filter((action) => action.kind === "SubTrigger");
    expect(watchers).toHaveLength(2);
    for (const watcher of watchers) {
      expect(watcher.sourceFilter).toEqual({ controller: "mine", kind: ["Digimon"] });
      expect(watcher.actions[0]).toMatchObject({ into: { controllerDefault: "mine" } });
    }
  });

  it("a RED triggering Digimon (your turn) => the gate passes and the digivolve fires", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    expect(install.matches!(h.subCtxFor("subj-red"))).toBe(true);
    await install.run(h.subCtxFor("subj-red"));
    expect(h.digivolveCalls).toBeGreaterThanOrEqual(1);
  });

  it("a NON-red triggering Digimon (your turn) => the gate blocks (digivolve never offered)", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    // FAILS-WHEN-REVERTED: drop the triggerSubjectHasColor conjunct and this blue subject matches.
    expect(install.matches!(h.subCtxFor("subj-blue"))).toBe(false);
  });

  it("an opponent's red Digimon does not satisfy the 'your Digimon' clause", async () => {
    const h = makeHarness(0 as Seat);
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;

    expect(install.matches!(h.subCtxFor("subj-opponent-red"))).toBe(false);
  });

  it("a red subject on the OPPONENT's turn => the your-turn conjunct blocks the gate", async () => {
    const h = makeHarness(1 as Seat); // opponent's turn
    await installWatchers(h);
    const install = h.installs.find((i) => i.matches !== undefined)!;
    expect(install.matches!(h.subCtxFor("subj-red"))).toBe(false);
  });
});

describe("BT25-026 — entry effects and inherited restriction", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s trashes the bottom three cards, then restricts one now-empty opponent Digimon",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT25-026", as: "source" }],
            battleArea: timing === EffectTiming.WhenDigivolving ? [{ card: "BT25-024", as: "base" }] : [],
          },
          1: {
            battleArea: [
              {
                card: "BT1-043",
                as: "stacked",
                under: ["BT1-001", "BT1-010", "BT25-024", "BT25-026"],
              },
              { card: "BT1-010", as: "empty" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const intent =
        timing === EffectTiming.OnPlay
          ? { type: "playCard" as const, instanceId: s.inst("source").instanceId }
          : {
              type: "digivolve" as const,
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("source").instanceId,
            };
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle(
        () => s.state.players[1]!.trash.length === 3 && observe(s.engine).isRestricted(s.perm("empty"), "beSuspended"),
      );

      expect(s.state.memory).toBe(timing === EffectTiming.OnPlay ? 4 : 7);
      expect(s.perm("stacked").stack).toHaveLength(1);
      expect(s.state.players[1]!.trash).toHaveLength(3);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-010", "BT25-024"]);
      expect(s.perm("stacked").stack[0]!.cardId).toBe("BT25-026");
      expect(observe(s.engine).isRestricted(s.perm("stacked"), "beSuspended")).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("empty"), "beSuspended")).toBe(true);
    },
  );

  it("inherits the attack-target-change restriction only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-018", as: "host", under: ["BT25-026"] }] } });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });

  it("prevents an opponent's restricted Digimon from attacking until their turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-026", as: "source" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-043", as: "target" }], deck: ["BT1-002"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "beSuspended"));

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("publicly rejects a Blocker redirect while the inherited restriction is active", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-018", as: "host", under: ["BT25-026"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("allows the same Blocker redirect without the inherited restriction", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-018", as: "host" }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it.each(["whenPlayed", "whenOneOfYoursDigivolves"] as const)(
    "digivolves into Dianamon from your trash for the reduced cost after a red own-Digimon %s event",
    async (event) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT25-026", as: "source" },
              { card: "BT1-010", as: "redSubject" },
            ],
            trash: [{ card: "BT25-028", as: "dianamon" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
      );
      s.state.memory = 2;
      await s.ready();

      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("redSubject").permanentId });
      await settle(() => s.perm("source").topCard.cardId === "BT25-028");

      expect(s.perm("source").topCard.cardId).toBe("BT25-028");
      expect(s.state.memory).toBe(0);
      expect(s.perm("source").stack.at(-1)?.cardId).toBe("BT25-026");
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("dianamon").instanceId);
    },
  );

  it("naturally reacts to playing a red Digimon by evolving Dianamon from trash for 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-026", as: "source" }],
          hand: [{ card: "BT1-009", as: "redSubject" }],
          trash: [{ card: "BT25-028", as: "dianamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("redSubject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard.cardId === "BT25-028");

    expect(s.perm("source").topCard.cardId).toBe("BT25-028");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("dianamon").instanceId);
  });

  it("naturally reacts to a public blue-to-red evolution using the post-evolution color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-026", as: "source" },
            { card: "BT25-024", as: "blueSubject" },
          ],
          hand: [{ card: "BT25-017", as: "redEvolution" }],
          trash: [{ card: "BT25-028", as: "dianamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSubject").permanentId,
        instanceId: s.inst("redEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT25-028");

    expect(s.perm("blueSubject").topCard.cardId).toBe("BT25-017");
    expect(s.perm("source").topCard.cardId).toBe("BT25-028");
    expect(s.state.memory).toBe(2);
  });

  it("may refuse the Dianamon evolution and keeps the card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-026", as: "source" },
            { card: "BT1-010", as: "redSubject" },
          ],
          trash: [{ card: "BT25-028", as: "dianamon" }],
          hand: [],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const firing = advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("redSubject").permanentId,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.perm("source").topCard.cardId).toBe("BT25-026");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dianamon").instanceId);
  });

  it("does not evolve when Dianamon is only in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-026", as: "source" },
            { card: "BT1-010", as: "redSubject" },
          ],
          hand: [{ card: "BT25-028", as: "dianamon" }],
          trash: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("redSubject").permanentId });

    expect(s.perm("source").topCard.cardId).toBe("BT25-026");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dianamon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("uses the post-evolution color for Q6291 and rejects a red-to-blue evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-026", as: "source" },
            { card: "BT1-014", as: "redSubject" },
          ],
          hand: [{ card: "BT25-026", as: "crescemon" }],
          trash: [{ card: "BT25-028", as: "dianamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redSubject").permanentId,
        instanceId: s.inst("crescemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redSubject").topCard.cardId === "BT25-026");

    expect(s.perm("redSubject").topCard.cardId).toBe("BT25-026");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dianamon").instanceId);
  });

  it("does not use a Dianamon in the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-026", as: "source" },
            { card: "BT1-010", as: "redSubject" },
          ],
        },
        1: { trash: [{ card: "BT25-028", as: "opponentDianamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("redSubject").permanentId });

    expect(s.perm("source").topCard.cardId).toBe("BT25-026");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentDianamon").instanceId);
  });

  it("keeps the printed metadata and legal TS alternate evolution route", async () => {
    expect(getCardDefinition("BT25-026")).toMatchObject({
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      types: ["Wizard", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor("BT25-026")).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-050", as: "tsBase" }],
        hand: [{ card: "BT25-026", as: "crescemon" }],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("crescemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === "BT25-026");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "nonTsBase" }],
        hand: [{ card: "BT25-026", as: "crescemon" }],
      },
    });
    invalid.state.memory = 3;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("crescemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
