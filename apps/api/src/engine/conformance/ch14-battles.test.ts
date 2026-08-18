import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, EffectTiming, type Seat, type ServerEvent } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { GameStateAccess } from "../state/access.js";
import { CombatController, type CombatHooks } from "../combat/controller.js";
import { WinCheck } from "../security/winCheck.js";
import { runSecurityCheck, type SecurityCheckDeps, type SecurityCheckAttacker } from "../security/securityCheck.js";
import { makeSecurityState, makeSecurityCard } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 14 "Battles" (comprehensive-0139-adjacent ids aside — the
 * real chapter-14 range is comprehensive-0014/-0155).
 *
 * comprehensive-0014 (the TOC dot-leader entry) carries no normative content and is seeded
 * in `not-testable.ts`; chapter 14 has no separate bare-heading chunk (the heading and its
 * §14-1/§14-2 body are merged into one chunk, comprehensive-0155, unlike every sibling
 * chapter in 10-13).
 *
 * Per the lane brief: §14-2-1-3's equal-DP "both lose" rule and the draw outcome are
 * ALREADY implemented and covered by `engine/security/winCheck.test.ts` and
 * `combat/resolve.test.ts`'s own tie-battle cases — this file verifies them again here
 * from the rules-citation angle (so comprehensive-0155 has a real behavioral citation) but
 * does not re-litigate the protocol shape those suites already pin down.
 */

const DIGIMON_A = "AD1-001";

let seq = 0;
function makePermanent(seat: Seat, dp: number, opts: { suspended?: boolean; cardId?: string } = {}): Permanent {
  seq += 1;
  const top = new CardInstance();
  top.instanceId = `ch14-inst-${seq}`;
  top.cardId = opts.cardId ?? DIGIMON_A;
  top.ownerSeat = seat;
  top.faceUp = true;
  const permanent = new Permanent();
  permanent.permanentId = `ch14-perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = top;
  permanent.isSuspended = opts.suspended ?? false;
  permanent.inBreeding = false;
  permanent.enterFieldTurnCount = -1;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

function bareState(): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  return state;
}

interface ControllerHarness {
  state: GameState;
  access: GameStateAccess;
  combat: CombatController;
  firedTimings: EffectTiming[];
  events: ServerEvent[];
}

function controllerHarness(extra?: Partial<CombatHooks>): ControllerHarness {
  const state = bareState();
  const access = new GameStateAccess(state);
  const firedTimings: EffectTiming[] = [];
  const events: ServerEvent[] = [];
  const hooks: CombatHooks = {
    emit: (e) => events.push(e),
    fireTiming: async (timing) => {
      firedTimings.push(timing);
    },
    checkSecurity: async () => {},
    ...extra,
  };
  return { state, access, combat: new CombatController(access, hooks), firedTimings, events };
}

describe("§14 Battles (comprehensive-0155)", () => {
  it("14-1/14-2-1-1/14-2-1-2: a battle compares DP — the higher-DP card wins, the lower-DP card loses and is deleted", async () => {
    cite(
      "comprehensive-0155",
      "14-1 a battle compares the DP of the two battling cards; 14-2-1-1 the higher-DP card " +
        "wins; 14-2-1-2 the lower-DP card loses",
    );

    const h = controllerHarness();
    const attacker = makePermanent(0, 9000);
    const defender = makePermanent(1, 4000, { suspended: true });
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(defender);

    await h.combat.resolveAttack(0, attacker, { kind: "permanent", permanentId: defender.permanentId });

    expect(h.access.permanentById(defender.permanentId)).toBeUndefined();
    expect(h.access.permanentById(attacker.permanentId)).toBeDefined();
    expect(h.state.players[1]!.trash.some((c) => c.instanceId === defender.topCard!.instanceId)).toBe(true);
  });

  it("14-2-1-3/14-2-2: equal DP is a tie — BOTH cards lose and are deleted AT THE SAME TIME (a single combatResolved carries both ids)", async () => {
    cite(
      "comprehensive-0155",
      "14-2-1-3 if both cards have the same DP, both lose the battle; 14-2-2 the loser is " +
        "immediately deleted, and if both lose, both are deleted at the same time",
    );

    const h = controllerHarness();
    const attacker = makePermanent(0, 5000);
    const defender = makePermanent(1, 5000, { suspended: true });
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(defender);

    await h.combat.resolveAttack(0, attacker, { kind: "permanent", permanentId: defender.permanentId });

    expect(h.access.permanentById(attacker.permanentId)).toBeUndefined();
    expect(h.access.permanentById(defender.permanentId)).toBeUndefined();
    // "at the same time" — a SINGLE combatResolved event lists both losers together, not two
    // separate sequential deletion events.
    const resolvedEvents = h.events.filter((e) => e.kind === "combatResolved");
    expect(resolvedEvents).toHaveLength(1);
    expect(resolvedEvents[0]).toMatchObject({
      deletedPermanentIds: expect.arrayContaining([attacker.permanentId, defender.permanentId]),
    });
  });

  it("14-2-3: a Security Digimon that loses a battle is NOT deleted the way a battle-area permanent is — it's simply trashed as a loose card", async () => {
    cite(
      "comprehensive-0155",
      "14-2-3 Security Digimon aren't deleted even when they lose a battle",
    );

    const ATTACKER_ID = "sec-attacker";
    const card = makeSecurityCard(1, 0, "AD1-002");
    const state = makeSecurityState([card], ATTACKER_ID);
    const win = new WinCheck(state, () => {});
    const deletePermanentCalls: string[][] = [];
    const deps: SecurityCheckDeps = {
      strikeFor: () => 1,
      permanentById: (id) => state.players[0]?.battleArea.find((p) => p.permanentId === id),
      fireTiming: async () => {},
      resolveSecurityEffect: async () => false,
      dpOf: () => 9000, // the attacker overwhelms the Security Digimon
      securityCardDp: () => 1000,
      isDigimon: () => true,
      deletePermanents: async (ids) => {
        deletePermanentCalls.push(ids); // only ever called for a battle-area PERMANENT
      },
    };
    const attacker: SecurityCheckAttacker = { permanentId: ATTACKER_ID };
    await runSecurityCheck(state, () => {}, win, deps, 1, attacker);

    // The Security Digimon lost the battle (attacker DP 9000 > its 1000), yet `deletePermanents`
    // — the seam that runs Permanent deletion processing (stack/top/linked -> trash, [On
    // Deletion] candidacy) — was NEVER called for it; it has no Permanent entity to delete.
    expect(deletePermanentCalls).toEqual([]);
    // It is simply trashed as a loose card instead (§13-1-8-4's own trash step).
    expect(state.players[1]!.trash.some((c) => c.instanceId === card.instanceId)).toBe(true);
    // The ATTACKER survived (it won), proving this was a genuine battle-loss case, not a
    // trivial "nothing happened" no-battle scenario.
    expect(state.players[0]!.battleArea.some((p) => p.permanentId === ATTACKER_ID)).toBe(true);
  });

  it("14-2-4: an effect triggered by the battle (OnDestroyedAnyone) is fully resolved before the next action (end-of-attack) begins", async () => {
    cite(
      "comprehensive-0155",
      "14-2-4 if an effect is triggered by a battle, it is resolved before the next action begins",
    );

    const h = controllerHarness();
    const attacker = makePermanent(0, 9000);
    const defender = makePermanent(1, 4000, { suspended: true });
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(defender);

    await h.combat.resolveAttack(0, attacker, { kind: "permanent", permanentId: defender.permanentId });

    const idxDestroyed = h.firedTimings.indexOf(EffectTiming.OnDestroyedAnyone);
    const idxEndAttack = h.firedTimings.indexOf(EffectTiming.OnEndAttack);
    expect(idxDestroyed).toBeGreaterThanOrEqual(0);
    expect(idxDestroyed).toBeLessThan(idxEndAttack); // the battle's own trigger resolves BEFORE the next action
  });

  it(
    "NOW MET: a card's own '[When this Digimon wins/ends a battle]' clause filed at EffectTiming.OnEndBattle should actually fire when a battle ends",
    async () => {
      cite(
        "comprehensive-0155",
        "DIVERGENCE: §14-2-5 'If an effect is triggered by the end of the battle timing when a " +
          "battle ends, that effect is to be resolved.' `EffectTiming.OnEndBattle` is a real " +
          "enum member (schema/enums.ts) and a real card files an ability under it — BT11-059's " +
          "'[All Turns][Once Per Turn] When this Digimon deletes an opponent's Digimon in " +
          "battle, unsuspend this Digimon' (cards/BT11/BT11-059.ts:95, " +
          "`if (timing === EffectTiming.OnEndBattle)`). But `CombatController.resolveDigimonBattle` " +
          "(combat/controller.ts) never calls `fireTiming(EffectTiming.OnEndBattle, ...)` " +
          "anywhere — the only post-battle-win timing it fires for a surviving attacker that " +
          "deleted the defender is `EffectTiming.OnBattleDeleteOpponent` (a DIFFERENT enum " +
          "member). BT11-059's own A3 test (cards/BT11/BT11-059.test.ts) only exercises its " +
          "OTHER (evo-cost-reduction) clause — nothing anywhere drives its OnEndBattle unsuspend " +
          "ability through a real battle, because there is no code path that ever would.",
      );

      const h = controllerHarness({
        fireTiming: async (timing) => {
          h.firedTimings.push(timing);
        },
      });
      const attacker = makePermanent(0, 9000, { cardId: "BT11-059" });
      const defender = makePermanent(1, 4000, { suspended: true });
      h.state.players[0]!.battleArea.push(attacker);
      h.state.players[1]!.battleArea.push(defender);

      await h.combat.resolveAttack(0, attacker, { kind: "permanent", permanentId: defender.permanentId });

      // EXPECTED (per §14-2-5): the end-of-battle timing fires so BT11-059's own filed ability
      // has a real chance to activate.
      expect(h.firedTimings).toContain(EffectTiming.OnEndBattle);
    },
  );
});
