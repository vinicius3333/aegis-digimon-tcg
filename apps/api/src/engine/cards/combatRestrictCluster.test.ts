import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  EffectDuration,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { GameStateAccess } from "../state/access.js";
import { CombatController, type CombatHooks } from "../combat/controller.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";
import "../../cards/index.js"; // register compiled cards so real combat runs

/**
 * Phase 4 Plan 11 — per-cluster A3 for the combat-restriction / redirect cluster
 * (CARD-01). Drives the PRODUCTION combat path and asserts a concrete GameState /
 * intent-result delta for each authored combat mechanism, with a recorded
 * REVERT-CONFIRM-RED lever. Mechanisms covered:
 *
 *   - cantBeAttacked  (P-086)   — a restriction on the DEFENDER rejects targeting it.
 *   - cantBeBlocked   (BT6-028) — a restriction on the ATTACKER rejects every block.
 *   - canAttackUnsuspended (ST12-08) — a positive grant lets the attacker hit an
 *                                       UNSUSPENDED opponent Digimon (normally illegal).
 *   - RedirectAttack  (ST18-14) — a When-Attacking redirect resolves combat against the
 *                                 NEW target, not the declared one.
 *   - endAttack       (BT23-069) — a When-Attacking "end the attack" skips block + battle.
 *
 * These exercise the engine reads added/confirmed by this plan
 * (combat/legality.ts canBlock/canAttackTarget; CombatController.endAttack).
 */

let seq = 0;

function instance(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const card = new CardInstance();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function digimon(seat: Seat, dp: number, cardId = "AD1-001"): Permanent {
  seq += 1;
  const permanent = new Permanent();
  permanent.permanentId = `handperm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

interface LedgerWriter {
  addRestriction(permanentId: string, restriction: string, duration: EffectDuration): void;
  grantCanAttackUnsuspended(
    permanentId: string,
    duration: EffectDuration,
    opts?: { noDigivolutionCards?: boolean },
  ): void;
}

/** Reach the engine's live continuous ledger at the boundary (private field). */
function ledger(s: EngineSetup): LedgerWriter {
  return (s.engine as unknown as { continuous: LedgerWriter }).continuous;
}

// --- CombatController harness (drive When-Attacking redirect / endAttack directly) ---

function makeState(): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return state;
}

interface ControllerHarness {
  state: GameState;
  access: GameStateAccess;
  combat: CombatController;
  events: ServerEvent[];
}

/** `onAttack` runs during the When-Attacking timing (where redirect / end-attack happen). */
function controllerHarness(onAttack?: (combat: CombatController) => void): ControllerHarness {
  const state = makeState();
  const access = new GameStateAccess(state);
  const events: ServerEvent[] = [];
  let combatRef: CombatController | undefined;
  const hooks: CombatHooks = {
    emit: (e) => events.push(e),
    fireTiming: async (timing) => {
      if (timing === EffectTiming.OnUseAttack && combatRef) onAttack?.(combatRef);
    },
    checkSecurity: async () => {},
  };
  const combat = new CombatController(access, hooks);
  combatRef = combat;
  return { state, access, combat, events };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("combat-restriction / redirect cluster A3 — cantBeAttacked (P-086)", () => {
  it("a 'can't be attacked' DEFENDER rejects an attack targeting it; another Digimon is still attackable", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 9000, as: "attacker" }] },
      1: {
        battleArea: [
          { card: "AD1-001", dp: 3000, suspended: true, as: "protectedDef" }, // suspended => normally a legal target
          { card: "AD1-001", dp: 3000, suspended: true, as: "otherDef" },
        ],
      },
    });
    const attacker = s.perm("attacker");
    const protectedDef = s.perm("protectedDef");
    const otherDef = s.perm("otherDef");

    // P-086's authored effect records this restriction on the chosen Digimon.
    ledger(s).addRestriction(
      protectedDef.permanentId,
      "cantBeAttacked",
      EffectDuration.UntilOpponentTurnEnd,
    );

    // Attacking the protected Digimon is rejected (server-authoritative legality).
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: protectedDef.permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    // The OTHER (unprotected) suspended Digimon is still a legal target.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: otherDef.permanentId },
      }),
    ).toEqual({ ok: true });
  });

  // REVERT-CONFIRM-RED: drop the `cantBeAttacked` read in legality.canAttackTarget
  // (delete the `if (reader?.hasRestriction(target, "cantBeAttacked")) return "illegal-target"`)
  // => attacking the protected Digimon returns { ok: true } => the first assertion goes RED.
});

describe("combat-restriction / redirect cluster A3 — cantBeBlocked (BT6-028)", () => {
  it("an attacker with 'can't be blocked' opens NO block window; without it a blocker is eligible", async () => {
    // Without the restriction: a ＜Blocker＞-less default reader is not used; instead drive the
    // production path where any unsuspended opponent Digimon may block (no live reader keywords
    // needed because the GameEngine reader enforces ＜Blocker＞). To isolate cantBeBlocked we use
    // the GameEngine path and assert the block-window eligibility via the emitted event.
    const withGrant = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 6000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX6-044", dp: 3000, as: "blocker" }], // EX6-044 prints ＜Blocker＞ => an eligible blocker
        security: ["AD1-001"],
      },
    });
    const attacker = withGrant.perm("attacker");
    const blocker = withGrant.perm("blocker");

    withGrant
      .engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      });
    await settle(() => withGrant.events.some((e) => e.kind === "blockWindowOpened"));
    const openedBaseline = withGrant.events.find((e) => e.kind === "blockWindowOpened") as
      | (ServerEvent & { eligibleBlockerIds: string[] })
      | undefined;
    // Baseline (no restriction): the ＜Blocker＞ is offered as an eligible blocker.
    expect(openedBaseline?.eligibleBlockerIds).toContain(blocker.permanentId);

    // Now the same board, but the attacker carries `cantBeBlocked`.
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 6000, as: "attacker2" }] },
      1: {
        battleArea: [{ card: "EX6-044", dp: 3000, as: "blocker2" }],
        security: ["AD1-001"],
      },
    });
    const attacker2 = s.perm("attacker2");

    ledger(s).addRestriction(attacker2.permanentId, "cantBeBlocked", EffectDuration.UntilEachTurnEnd);

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker2.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    const opened = s.events.find((e) => e.kind === "blockWindowOpened") as
      | (ServerEvent & { eligibleBlockerIds: string[] })
      | undefined;
    // With `cantBeBlocked` on the attacker, NO response window is announced.
    expect(opened).toBeUndefined();
  });

  // REVERT-CONFIRM-RED: drop the attacker `cantBeBlocked` check in legality.canBlock
  // => the ＜Blocker＞ is offered again => `eligibleBlockerIds` is non-empty => the
  // `toBeUndefined()` assertion goes RED (and the baseline assertion still passes).
});

describe("combat-restriction / redirect cluster A3 — canAttackUnsuspended (ST12-08)", () => {
  it("an UNSUSPENDED opponent Digimon is normally unattackable, but the grant makes it legal", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "unsuspendedDef" }] }, // base rule: cannot be attacked
    });
    const attacker = s.perm("attacker");
    const unsuspendedDef = s.perm("unsuspendedDef");

    // Baseline: attacking an UNSUSPENDED Digimon is illegal.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedDef.permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    // ST12-08's authored grant: this attacker may also attack unsuspended Digimon.
    ledger(s).grantCanAttackUnsuspended(attacker.permanentId, EffectDuration.UntilEachTurnEnd);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedDef.permanentId },
      }),
    ).toEqual({ ok: true });
  });

  // REVERT-CONFIRM-RED: drop the `canAttackUnsuspended` relaxation in legality.canAttackTarget
  // (restore the unconditional `if (!defender.isSuspended) return "illegal-target"`)
  // => the second attack returns { ok: false } => the post-grant assertion goes RED.

  it("a 'no digivolution cards' grant (EX1-016) only reaches an unsuspended defender with an empty stack", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 9000, as: "attacker" }] },
      1: {
        battleArea: [
          { card: "AD1-001", dp: 3000, as: "bareDef" }, // unsuspended, no digivolution cards
          { card: "AD1-001", dp: 3000, as: "stackedDef", under: ["AD1-001"] }, // unsuspended, HAS a digivolution card under it
        ],
      },
    });
    const attacker = s.perm("attacker");
    const bareDef = s.perm("bareDef");
    const stackedDef = s.perm("stackedDef");

    // EX1-016's grant: may attack unsuspended Digimon, but only those WITH NO digivolution cards.
    ledger(s).grantCanAttackUnsuspended(attacker.permanentId, EffectDuration.UntilEachTurnEnd, {
      noDigivolutionCards: true,
    });

    // The unsuspended Digimon WITH a digivolution card stays illegal — the grant doesn't reach it.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: stackedDef.permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    // The bare (no-stack) unsuspended Digimon is a legal target.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: bareDef.permanentId },
      }),
    ).toEqual({ ok: true });
  });

  // REVERT-CONFIRM-RED: drop the `canAttackUnsuspendedRequiresNoDigivolution` check in
  // legality.canAttackTarget => attacking the stacked unsuspended Digimon returns { ok: true }
  // => the second assertion goes RED.
});

describe("combat-restriction / redirect cluster A3 — RedirectAttack (ST18-14)", () => {
  it("a When-Attacking redirect resolves combat against the NEW target, not the declared one", async () => {
    const declaredId = "redirect-declared";
    const h = controllerHarness((combat) => {
      // The ST18-14 redirect picks a DIFFERENT opponent Digimon during When Attacking.
      combat.redirectTarget({ kind: "permanent", permanentId: redirectedDef.permanentId });
    });
    const attacker = digimon(0, 9000);
    attacker.permanentId = "redirect-attacker";
    const declaredDef = digimon(1, 1000);
    declaredDef.permanentId = declaredId;
    declaredDef.isSuspended = true;
    const redirectedDef = digimon(1, 2000);
    redirectedDef.isSuspended = true;
    h.state.players[0]?.battleArea.push(attacker);
    h.state.players[1]?.battleArea.push(declaredDef, redirectedDef);

    await h.combat.resolveAttack(0, attacker, {
      kind: "permanent",
      permanentId: declaredDef.permanentId,
    });
    await flush();

    // Combat resolved against the REDIRECTED Digimon (deleted), and the DECLARED target
    // was untouched — the attack switched targets mid-flight.
    expect(h.access.permanentById(redirectedDef.permanentId)).toBeUndefined();
    expect(h.access.permanentById(declaredDef.permanentId)).toBeDefined();
  });

  // REVERT-CONFIRM-RED: make CombatController.redirectTarget a no-op (return false without
  // mutating currentAttack.target) => combat resolves against the DECLARED target =>
  // declaredDef is deleted and redirectedDef survives => both assertions go RED.
});

describe("combat-restriction / redirect cluster A3 — endAttack (BT23-069)", () => {
  it("a When-Attacking 'end the attack' skips block + battle; the defender is NOT battled", async () => {
    const h = controllerHarness((combat) => combat.endAttack());
    const attacker = digimon(0, 9000);
    const defender = digimon(1, 1000);
    defender.isSuspended = true;
    h.state.players[0]?.battleArea.push(attacker);
    h.state.players[1]?.battleArea.push(defender);

    await h.combat.resolveAttack(0, attacker, {
      kind: "permanent",
      permanentId: defender.permanentId,
    });
    await flush();

    // The attack ended before battle: the (weaker) defender was NOT deleted, no combat resolved,
    // and the controller is no longer attacking.
    expect(h.access.permanentById(defender.permanentId)).toBeDefined();
    expect(h.events.some((e) => e.kind === "combatResolved")).toBe(false);
    expect(h.combat.isAttacking).toBe(false);
  });

  // REVERT-CONFIRM-RED: make CombatController.endAttack a no-op (don't set endRequested), or
  // drop the `if (this.endRequested) { ...; return; }` guard in resolveAttack => the 9000-DP
  // attacker battles and deletes the 1000-DP defender => `toBeDefined()` and the
  // `combatResolved` assertion go RED.
});
