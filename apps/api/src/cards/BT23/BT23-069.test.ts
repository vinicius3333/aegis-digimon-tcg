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
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as bt23069 } from "./BT23-069.js";

/**
 * A3 for BT23-069 Necromon's [All Turns] delete-outcome-conditional clause (plan 08-03),
 * consuming the Wave-1 (08-01) effect-RESULT-BINDING (ctx.lastDeleteCount -> the
 * `ifThisEffectDidNotDelete` gating Condition):
 *
 *   "[All Turns] When another Digimon attacks, by deleting this Digimon, delete 1 of your
 *    opponent's level 6 or lower Digimon. If this effect didn't delete your opponent's
 *    Digimon, you may end that attack."   (documented behavior OnAllyAttack)
 *
 * KB authority (node tools/kb/query.mjs card BT23-069):
 *   Q5337: if the opponent has a Lv.<=6 Digimon you MUST choose and delete it (the delete is
 *     not skippable to fake the "didn't delete" branch).
 *   Q5338: choosing a deletion-IMMUNE Lv.<=6 target satisfies "didn't delete" (count 0) — so
 *     the gate reads the count ACTUALLY removed, not whether a target was chosen.
 *   Q5339/Q5340: "end the attack" changes the TIMING, not the Digimon.
 *
 * The REAL authored card IR is resolved through the interpreter; its AllTurns clause installs a
 * `whenAttacking` SubTrigger watcher whose body is [Delete (cost: delete self), EndAttack gated
 * on ifThisEffectDidNotDelete]. We capture the installed `run` body and run it through the REAL
 * interpreter with a fake fx whose `deletePermanent` reports a controlled removal count — driving
 * the two outcome branches:
 *   - the opponent Digimon is actually deleted (count 1) => the gate is FALSE => the attack
 *     CONTINUES (endAttack is NOT requested).
 *   - the chosen target is deletion-immune (count 0, Q5338) => the gate is TRUE => endAttack runs.
 *
 * FAILS-WHEN-REVERTED: hard-code the EndAttack gate to "always end" (drop the
 * `ifThisEffectDidNotDelete` condition on the EndAttack action in BT23-069.ts) => the
 * deleted-target case wrongly ends the attack => the "endAttack NOT requested" assertion RED.
 */

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
  /** What the fake deletePermanent reports as the count actually removed (Q5338 immune => 0). */
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
    // The card's Static "Execute" GainKeyword resolves at EffectTiming.None too; a no-op satisfies it.
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

/** Resolve BT23-069's real AllTurns clause and return the installed whenAttacking watcher. */
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

  it("requires the mandatory self-deletion cost before the opponent deletion", () => {
    const effect = bt23069.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const watcher = effect.actions[0];
    expect(watcher.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      abortOnDecline: true,
    });
    expect(watcher.actions[0].optional).toBeUndefined();
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
    expect(s.state.players[1]!.security).toHaveLength(2);
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
      deleteCount: (ids) => ids.length, // a genuine delete: the opponent Digimon left the field
      installed,
    });
    const watcher = await installWatcher(ctx, installed);

    await watcher.run(ctx);

    // The opponent Lv.<=6 Digimon was deleted (count 1) => ifThisEffectDidNotDelete is FALSE.
    expect(ctx.lastDeleteCount).toBe(1);
    // FAILS-WHEN-REVERTED: hard-code the EndAttack to always-end => endAttacks becomes 1 here.
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
      // A target WAS chosen, but it is deletion-immune => 0 actually removed (Q5338).
      deleteCount: (ids) => (ids.includes(self.permanentId) ? ids.length : 0),
      installed,
    });
    const watcher = await installWatcher(ctx, installed);

    await watcher.run(ctx);

    expect(ctx.lastDeleteCount).toBe(0);
    // The gate is TRUE (nothing was deleted) => the optional EndAttack runs (ask.optional => yes).
    expect(recorder.endAttacks).toBe(1);
  });
});
