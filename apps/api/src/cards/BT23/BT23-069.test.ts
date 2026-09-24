import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled as bt23069 } from "./BT23-069.js";

let seq = 0;

function makeDefinition(cardId: string): CardDefinition {
  return {
    cardId,
    set: "BT23",
    nameEn: cardId,
    kinds: ["Digimon"],
    colors: [],
    level: 6,
    playCost: 0,
    dp: 6000,
    evoCosts: [],
    maxCountInDeck: 4,
  } as CardDefinition;
}

function makePermanent(cardId: string, seat: Seat): Permanent {
  seq += 1;
  return {
    permanentId: `p-${cardId}-${seq}`,
    controllerSeat: seat,
    topCard: { instanceId: `i-${seq}`, cardId, ownerSeat: seat, faceUp: true } as never,
    stack: [] as never,
    linked: [] as never,
    baseDP: 6000,
    currentDP: 6000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(self: Permanent): CardSource {
  return {
    instanceId: "SRC#1",
    cardId: "BT23-069",
    ownerSeat: 0 as Seat,
    definition: makeDefinition("BT23-069"),
    permanent: () => self,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface Recorder {
  endAttacks: number;
  deleteCalls: { ids: string[] }[];
}

function makeContext(opts: {
  self: Permanent;
  opponentBattleArea: Permanent[];
  recorder: Recorder;
  deleteCount: (ids: string[]) => number;
  installed: SubTriggerInstall[];
}): EffectContext {
  const own = [opts.self];
  const opponent = opts.opponentBattleArea;
  const players = [
    { seat: 0, battleArea: own, security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opponent, security: [], hand: [], deck: [], trash: [] },
  ];
  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => [...own, ...opponent].find((p) => p.permanentId === id),
    definitionOf: (card) => makeDefinition(card.cardId),
    linkMax: () => 1,
  };
  const fx = {
    subscribeSubTrigger: (sub: SubTriggerInstall) => {
      opts.installed.push(sub);
      return opts.installed.length;
    },
    deletePermanent: async (ids: string[]) => {
      opts.recorder.deleteCalls.push({ ids });
      return opts.deleteCount(ids);
    },
    endAttack: () => {
      opts.recorder.endAttacks += 1;
      return true;
    },
    grantKeyword: () => {},
  } as unknown as Primitives;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_ctx, o) => o.candidates.slice(0, o.max),
    selectCards: async (_ctx, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };
  return { source: makeSource(opts.self), trigger: {}, game, fx, ask, selections: new Map<string, string>() };
}

async function installWatcher(ctx: EffectContext, installed: SubTriggerInstall[]): Promise<SubTriggerInstall> {
  const module = irCardModule("BT23-069-test", bt23069);
  const effects = module.effectsForTiming(EffectTiming.None, ctx.source);
  for (const effect of effects) await effect.resolve(ctx);
  const watcher = installed.find((s) => s.event === "whenAttacking");
  if (watcher === undefined) throw new Error("BT23-069 did not install a whenAttacking watcher");
  return watcher;
}

describe("A3 BT23-069 — delete-outcome gate: continue if it deleted, end if it didn't", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-069")).toMatchObject({
      cardId: "BT23-069",
      nameEn: "Necromon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
    });
    expect(bt23069.coverage).toBe("full");
    expect(bt23069.residual).toEqual([]);
  });

  it("models self-deletion as an optional By processing condition before the opponent deletion", () => {
    const effect = bt23069.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const watcher = effect.actions[0];
    expect(watcher.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      abortOnDecline: true,
    });
    expect(watcher.actions[0].optional).toBe(true);
  });

  it("exposes Execute through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-069", as: "necromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("necromon"), "Execute")).toBe(true);
  });

  it("deletes itself and an eligible opponent, plays a Ghost on deletion, and lets the attack continue", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-069", as: "necromon" },
            { card: "BT23-061", as: "attacker" },
          ],
          trash: [{ card: "BT23-064", as: "ghost" }],
        },
        1: {
          battleArea: [{ card: "BT23-068", as: "target" }],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostId = s.inst("ghost").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-069")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("deletes itself and ends the attack when no eligible opponent can be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-069", as: "necromon" },
            { card: "BT23-061", as: "attacker" },
          ],
        },
        1: { security: ["BT1-028", "BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-069")).toBe(false);
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT23-069")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[All Turns] When another Digimon attacks, by deleting this Digimon, delete 1 of your opponent's level 6 or lower Digimon.",
      "If this effect didn't delete your opponent's Digimon, you may end that attack.",
    ]);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("may decline self-deletion, leaving both Digimon in play while the attack proceeds", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-069", as: "necromon" },
            { card: "BT23-061", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-068", as: "target" }],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const selfId = s.perm("necromon").permanentId;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === selfId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("the effect deletes the opponent's Lv.<=6 Digimon (count 1) => the attack CONTINUES (no endAttack)", async () => {
    const self = makePermanent("BT23-069", 0 as Seat);
    const oppLow = makePermanent("OPP-L6", 1 as Seat);
    const recorder: Recorder = { endAttacks: 0, deleteCalls: [] };
    const installed: SubTriggerInstall[] = [];
    const ctx = makeContext({
      self,
      opponentBattleArea: [oppLow],
      recorder,
      deleteCount: (ids) => ids.length,
      installed,
    });
    const watcher = await installWatcher(ctx, installed);

    await watcher.run(ctx);

    expect(ctx.lastDeleteCount).toBe(1);
    expect(recorder.endAttacks).toBe(0);
  });

  it("the chosen Lv.<=6 target is deletion-IMMUNE (count 0, Q5338) => the attack ENDS", async () => {
    const self = makePermanent("BT23-069", 0 as Seat);
    const oppImmune = makePermanent("OPP-IMMUNE", 1 as Seat);
    const recorder: Recorder = { endAttacks: 0, deleteCalls: [] };
    const installed: SubTriggerInstall[] = [];
    const ctx = makeContext({
      self,
      opponentBattleArea: [oppImmune],
      recorder,
      deleteCount: (ids) => (ids.includes(self.permanentId) ? ids.length : 0),
      installed,
    });
    const watcher = await installWatcher(ctx, installed);

    await watcher.run(ctx);

    expect(ctx.lastDeleteCount).toBe(0);
    expect(recorder.endAttacks).toBe(1);
  });
});

async function answerOptionals(
  s: EngineSetup,
  decide: (promptText: string) => boolean,
  done: () => boolean,
): Promise<void> {
  const answered = new Set<string>();
  for (let tick = 0; tick < 2000; tick += 1) {
    await Promise.resolve();
    for (const { seat, req } of s.decisions) {
      if (req.kind !== "optional" || answered.has(req.decisionId)) continue;
      answered.add(req.decisionId);
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "optional", accept: decide(req.promptText) },
      });
    }
    if (done()) break;
  }
  await settle(done);
}

const SELF_DELETE_PROMPT = "by deleting this Digimon";

const FILLER_DECK = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-027", "BT1-028", "BT1-045"];

async function passTurnToOpponent(s: EngineSetup): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await answerOptionals(
    s,
    () => false,
    () => s.state.turnSeat === 1,
  );
  await advance(s.engine).waitForMainPhase(1);
  expect(s.state.turnSeat).toBe(1);
  return { loop };
}

async function finishTurnLoop(s: EngineSetup, loop: Promise<void>): Promise<void> {
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-069 Necromon — printed clauses through public intents", () => {
  it("plays a level 5 or lower [Ghost] Digimon from the trash on play without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-069", as: "necromon" }],
          trash: [
            { card: "BT23-064", as: "ghost" },
            { card: "BT1-028", as: "notGhost" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const necromonId = s.inst("necromon").instanceId;
    const ghostId = s.inst("ghost").instanceId;
    const notGhostId = s.inst("notGhost").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: necromonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual(
      expect.arrayContaining([necromonId, ghostId]),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([notGhostId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("leaves the Ghost in the trash when the On Play optional is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-069", as: "necromon" }],
          trash: [{ card: "BT23-064", as: "ghost" }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const necromonId = s.inst("necromon").instanceId;
    const ghostId = s.inst("ghost").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: necromonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === necromonId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([ghostId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("plays nothing when the trash holds no level 5 or lower [Ghost] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-069", as: "necromon" }],
          trash: [
            { card: "BT23-069", as: "tooHigh" },
            { card: "BT1-028", as: "notGhost" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const necromonId = s.inst("necromon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: necromonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === necromonId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });

  it("does not fire on its own attack — the clause reads 'another Digimon'", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-069", as: "necromon" }] },
        1: {
          battleArea: [{ card: "BT23-068", as: "target" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const necromonPermanentId = s.perm("necromon").permanentId;
    const targetPermanentId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: necromonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === necromonPermanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetPermanentId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("fires on the opponent's attack too and deletes the attacking Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-069", as: "necromon" }],
          hand: [{ card: "BT1-009", as: "spare0" }],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT23-068", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await passTurnToOpponent(s);
    const necromonPermanentId = s.perm("necromon").permanentId;
    const attackerPermanentId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerOptionals(
      s,
      () => true,
      () => s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === necromonPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerPermanentId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    await finishTurnLoop(s, loop);
  });

  it("never offers to skip the opponent deletion when an eligible target exists (Q5337)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-069", as: "necromon" },
            { card: "BT23-061", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-068", as: "target" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetPermanentId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetPermanentId)).toBe(false);
    const necromonPrompts = s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT23-069");
    expect(necromonPrompts.map(({ req }) => req.promptText)).toEqual([SELF_DELETE_PROMPT]);
  });

  it("ends the attack when the only eligible target is immune to the deletion (Q5338, Q5339, Q5340)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-069", as: "necromon" }],
          hand: [{ card: "BT1-009", as: "spare0" }],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT14-062", as: "immuneAttacker" }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await passTurnToOpponent(s);
    const necromonPermanentId = s.perm("necromon").permanentId;
    const attackerPermanentId = s.perm("immuneAttacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerOptionals(
      s,
      () => true,
      () => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 0,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === necromonPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerPermanentId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    await finishTurnLoop(s, loop);
  });

  it("may decline to end the attack, letting it check security instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-069", as: "necromon" },
            { card: "BT23-061", as: "attacker" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const necromonPermanentId = s.perm("necromon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerOptionals(
      s,
      (promptText) => promptText === SELF_DELETE_PROMPT,
      () => s.state.players[1]!.security.length === 1,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === necromonPermanentId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(
      s.decisions.some(
        ({ req }) =>
          req.kind === "optional" && req.sourceCardId === "BT23-069" && req.promptText !== SELF_DELETE_PROMPT,
      ),
    ).toBe(true);
  });
});
