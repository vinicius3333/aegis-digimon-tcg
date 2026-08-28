import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  Phase,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { GameStateAccess } from "../state/access.js";
import { CombatController, type CombatHooks } from "../combat/controller.js";
import { validateAttack, applyAttack } from "../actions/attack.js";
import { setupEngine as setup, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 11 "Attacking" (comprehensive-0139 misfiled-adjacent ids
 * aside — the real chapter-11 range is comprehensive-0142-0149).
 *
 * comprehensive-0142 (bare chapter heading) and the TOC dot-leader entry
 * (comprehensive-0011) carry no normative content and are seeded in `not-testable.ts`; the
 * real content chunks are comprehensive-0143 through -0149.
 *
 * Two test styles are used deliberately:
 *   - the player-facing verbs (attack/declareBlock/declineBlock) driven through the real
 *     `GameEngine`, via `../testkit/harness.js` — for rules that are Intent-validation-shaped;
 *   - `CombatController` driven directly with fake hooks (mirroring `combat/controller.test.ts`)
 *     — for rules about the internal timing SEQUENCE (which this suite needs to observe
 *     directly; the client-facing ServerEvent stream does not surface every internal
 *     EffectTiming window, e.g. there is no client-visible "end of attack" event).
 */

const DIGIMON_A = "AD1-001";
const DIGIMON_B = "AD1-002";
const BLOCKER_CARD = "ST18-07"; // real card printed exactly "＜Blocker＞." (Comprehensive Rules §16-5)

let seq = 0;
function makePermanent(seat: Seat, dp: number, opts: { suspended?: boolean; cardId?: string } = {}): Permanent {
  seq += 1;
  const top = new CardInstance();
  top.instanceId = `ch11-inst-${seq}`;
  top.cardId = opts.cardId ?? DIGIMON_A;
  top.ownerSeat = seat;
  top.faceUp = true;
  const permanent = new Permanent();
  permanent.permanentId = `ch11-perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = top;
  permanent.isSuspended = opts.suspended ?? false;
  permanent.inBreeding = false;
  permanent.enterFieldTurnCount = -1; // not-this-turn sentinel (no summoning-sickness interference)
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

function bareCombatState(): { state: GameState; access: GameStateAccess } {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  return { state, access: new GameStateAccess(state) };
}

interface ControllerHarness {
  state: GameState;
  access: GameStateAccess;
  combat: CombatController;
  firedTimings: EffectTiming[];
  events: ServerEvent[];
}

function controllerHarness(extra?: Partial<CombatHooks>): ControllerHarness {
  const { state, access } = bareCombatState();
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

describe("§11-1 Attack Procedure (comprehensive-0143)", () => {
  it("11-1-2: only the turn player can attack — a non-turn-player attack declaration is rejected", () => {
    cite("comprehensive-0143", "11-1-2 only the turn player can attack");

    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    s.state.turnSeat = 0;

    // Seat 1 (non-turn) tries to attack with seat 0's Digimon.
    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("11-1-3/11-1-4: the attack timings resolve strictly in order — declaration, then the block window, then the block itself", async () => {
    cite(
      "comprehensive-0143",
      "11-1-3 an attack proceeds through ordered timings; 11-1-4 the next timing doesn't begin " +
        "until all processing for the current one is resolved",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: BLOCKER_CARD, dp: 1000, as: "blocker" }] },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);
    s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"), 5000);

    const order = s.events.map((e) => e.kind);
    const idxDeclared = order.indexOf("attackDeclared");
    const idxWindow = order.indexOf("blockWindowOpened");
    const idxBlocked = order.indexOf("blocked");
    const idxResolved = order.indexOf("combatResolved");
    expect(idxDeclared).toBeGreaterThanOrEqual(0);
    expect(s.events.find((e) => e.kind === "attackDeclared")).toMatchObject({
      seat: 0,
      attackerPermanentId: attacker.permanentId,
      attackerCardId: DIGIMON_A,
    });
    // Strict order: declaration -> block window -> block -> battle resolution.
    expect(idxDeclared).toBeLessThan(idxWindow);
    expect(idxWindow).toBeLessThan(idxBlocked);
    expect(idxBlocked).toBeLessThan(idxResolved);
  });

  it("11-1-5: once an attack is declared, the later timings still occur even if the attacker leaves the field mid-resolution", async () => {
    cite(
      "comprehensive-0143",
      "11-1-5 once an attack declaration is made, all of the timings that follow will occur, " +
        "even if the attacking Digimon leaves the battle area",
    );

    const h = controllerHarness({
      fireTiming: async (timing, trigger) => {
        h.firedTimings.push(timing);
        // Remove the attacker from the field during the first (OnUseAttack) window — mirrors an
        // effect that deletes/bounces the attacker between declaration and the block window.
        if (timing === EffectTiming.OnUseAttack) {
          const seat = h.state.players.find((p) =>
            p?.battleArea.some((pp) => pp.permanentId === trigger.attackerPermanentId),
          );
          if (seat !== undefined) {
            seat.battleArea = seat.battleArea.filter((pp) => pp.permanentId !== trigger.attackerPermanentId) as never;
          }
        }
      },
    });
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    // The attacker left play mid-resolution, yet OnEndAttack (the end-of-attack timing) STILL
    // fired — the later timing occurred despite the attacker leaving the battle area.
    expect(h.firedTimings).toContain(EffectTiming.OnUseAttack);
    expect(h.firedTimings).toContain(EffectTiming.OnEndAttack);
    // No block window or battle happened (the attacker was already gone) — narrows the assertion
    // to exactly "the end-of-attack timing still ran", not "everything ran".
    expect(h.events.some((e) => e.kind === "blockWindowOpened")).toBe(false);
  });
});

describe("§11-2 Attack Declaration (comprehensive-0144)", () => {
  it("11-2-1: declaring an attack suspends the attacking Digimon", async () => {
    cite("comprehensive-0144", "11-2-1 the turn player suspends their Digimon to make an attack declaration");

    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    expect(attacker.isSuspended).toBe(false);

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => attacker.isSuspended, 5000);
    expect(attacker.isSuspended).toBe(true);
  });

  it("11-2-3: 1 Digimon can perform only 1 attack per turn — a second declaration with the same attacker is rejected", async () => {
    cite(
      "comprehensive-0144",
      "11-2-3 1 Digimon can perform 1 attack for an attack declaration; multiple attacks aren't allowed",
    );

    // Driven directly against the pure `validateAttack` (actions/attack.ts) with a hand-built
    // AttackDeps, rather than through the full GameEngine: a real attack's own resolution
    // re-checks the turn-end condition immediately (checkTurnEndAfterVerb), which is an
    // unrelated concern this test must not become entangled with. `attackedThisTurn` is the
    // exact seam attack.ts documents for §11-2-3 ("each Digimon may attack at most once per
    // turn"), so this drives it directly.
    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    const access = new GameStateAccess(s.state);
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean; resolveAttack: unknown } }).combat;
    const deps = {
      state: s.state,
      access,
      combat: combat as never,
      onCombatError: () => {},
      attackedThisTurn: new Set([attacker.permanentId]), // this permanent already attacked this turn
    };

    const secondReason = validateAttack(deps, 0, {
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(secondReason).toBe("illegal-target");

    // The same attacker, WITHOUT the attackedThisTurn membership, is legal — isolating the cap
    // as the actual cause of the rejection above (not suspension or any other guard).
    const withoutCap = validateAttack({ ...deps, attackedThisTurn: new Set() }, 0, {
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(withoutCap).toBeNull();
  });

  it("11-2-4: a new attack declaration can't be made while another attack is mid-resolution", async () => {
    cite("comprehensive-0144", "11-2-4 a new attack declaration can't be made during an attack");

    const s = setup({
      0: {
        battleArea: [
          { card: DIGIMON_A, dp: 9000, as: "attacker" },
          { card: DIGIMON_A, dp: 9000, as: "secondAttacker" },
        ],
      },
      1: { battleArea: [{ card: BLOCKER_CARD, dp: 1000, as: "blocker" }] },
    });
    const attacker = s.perm("attacker");
    const secondAttacker = s.perm("secondAttacker");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    // The block window is open, so the first attack is still mid-resolution.
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);

    const secondDeclare = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: secondAttacker.permanentId,
      target: { kind: "player" },
    });
    expect(secondDeclare).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("11-2-5: an attack declaration can't be made using a Digimon that's already suspended", () => {
    cite(
      "comprehensive-0144",
      "11-2-5 an attack declaration can't be made using a Digimon that can't suspend (already suspended)",
    );

    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, suspended: true, as: "attacker" }] } });
    const attacker = s.perm("attacker");

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("11-2-6: even if the attack target is removed mid-attack, that target remains the attack target and the attack simply fails", async () => {
    cite(
      "comprehensive-0144",
      "11-2-6 even if the attack target Digimon is removed during an attack, it remains the " +
        "attack target and the attack fails",
    );

    const h = controllerHarness({
      fireTiming: async (timing, trigger) => {
        h.firedTimings.push(timing);
        if (timing === EffectTiming.OnUseAttack && trigger.defenderPermanentId !== undefined) {
          // Delete the DEFENDER between declaration and the block window.
          for (const p of h.state.players) {
            if (p === undefined) continue;
            p.battleArea = p.battleArea.filter((pp) => pp.permanentId !== trigger.defenderPermanentId) as never;
          }
        }
      },
    });
    const attacker = makePermanent(0, 9000);
    const defender = makePermanent(1, 1000, { suspended: true });
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(defender);

    await h.combat.resolveAttack(0, attacker, { kind: "permanent", permanentId: defender.permanentId });

    // The attack must NOT fall back to a player-directed security check just because the
    // permanent target vanished — it fails outright.
    expect(h.events.some((e) => e.kind === "securityChecked")).toBe(false);
    expect(h.events.some((e) => e.kind === "combatResolved")).toBe(false);
    expect(h.firedTimings).toContain(EffectTiming.OnEndAttack);
  });
});

describe("§11-2-7 Attack Targets (comprehensive-0145)", () => {
  it("11-2-7-1: the legal attack targets are the opponent player, or one of the opponent's SUSPENDED Digimon", async () => {
    cite(
      "comprehensive-0145",
      "11-2-7-1 the attack target is either the opponent, or 1 of the opponent's suspended Digimon",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] },
      1: { battleArea: [{ card: DIGIMON_A, dp: 1000, as: "unsuspended" }] },
    });
    const attacker = s.perm("attacker");
    const unsuspended = s.perm("unsuspended");

    // An unsuspended opponent Digimon is NOT a legal target (base rule, no relaxing grant).
    const badTarget = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: unsuspended.permanentId },
    });
    expect(badTarget).toEqual({ ok: false, reason: "illegal-target" });

    // The opponent player is always legal.
    const playerTarget = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(playerTarget).toEqual({ ok: true });
  });

  it("11-2-7-2: the attack target may be switched to another target mid-attack (a rule/effect redirect)", async () => {
    cite("comprehensive-0145", "11-2-7-2 after the attack declaration, the attack target may switch to another target");

    const h = controllerHarness();
    const attacker = makePermanent(0, 9000);
    const newTarget = makePermanent(1, 1000, { suspended: true });
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(newTarget);

    const resolving = h.combat.resolveAttack(0, attacker, { kind: "player" });
    // Redirect while the attack is in flight (a Counter/When-Attacking-style effect).
    const redirected = h.combat.redirectTarget({ kind: "permanent", permanentId: newTarget.permanentId });
    await resolving;

    expect(redirected).toBe(true);
    // The RE-narrated attackDeclared carries the switched target.
    const redeclared = h.events.filter((e) => e.kind === "attackDeclared");
    expect(redeclared.at(-1)).toMatchObject({
      target: { kind: "permanent", permanentId: newTarget.permanentId },
      targetCardId: newTarget.topCard.cardId,
    });
    // The battle resolved against the switched target, not the player.
    expect(h.events.some((e) => e.kind === "securityChecked")).toBe(false);
  });

  it("11-2-7-4: if the attacking Digimon isn't in the battle area, its target can't be changed and it fails on any target", async () => {
    cite(
      "comprehensive-0145",
      "11-2-7-4 if an attacking Digimon isn't in the battle area, its attack target can't be " +
        "changed and its attack won't succeed on any target",
    );

    const h = controllerHarness({
      fireTiming: async (timing, trigger) => {
        h.firedTimings.push(timing);
        if (timing === EffectTiming.OnUseAttack) {
          h.state.players[0]!.battleArea = h.state.players[0]!.battleArea.filter(
            (pp) => pp.permanentId !== trigger.attackerPermanentId,
          ) as never;
        }
      },
    });
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    expect(h.combat.redirectTarget({ kind: "player" })).toBe(false); // no in-flight attack to redirect once resolved
    expect(h.events.some((e) => e.kind === "securityChecked")).toBe(false);
  });
});

describe("§11-3 Counter Timing (comprehensive-0146)", () => {
  it("11-3-1/11-1-3: the counter timing window opens between attack declaration and the block window", async () => {
    cite(
      "comprehensive-0146",
      "11-3-1 the counter timing is when a non-turn player's [Counter] effect can activate; " +
        "11-1-3's ordered list places it between attack declaration and block timing. " +
        "`CombatController.runCounterWindow` opens a distinct §11-3 window (EffectTiming.OnCounterTiming, " +
        "a dedicated enum member — not the generic OnDeclaration bucket) right after the When Attacking " +
        "timings resolve and before `runBlockWindow`, emitting `counterWindowOpened`.",
    );

    const h = controllerHarness({
      counterEligible: () => [{ instanceId: "x", effectKey: "k", description: "test" }],
    });
    const attacker = makePermanent(0, 9000);
    const blocker = makePermanent(1, 3000);
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.battleArea.push(blocker);

    const resolved = h.combat.resolveAttack(0, attacker, { kind: "player" });
    await settle(() => h.events.some((e) => e.kind === "counterWindowOpened"));
    expect(h.combat.hasOpenCounterWindow).toBe(true);
    expect(h.combat.counterWindowSeat).toBe(1); // the non-turn (defending) seat
    h.combat.resolveCounterPass(1);
    expect(h.events).toContainEqual({
      kind: "counterResolved",
      attackerPermanentId: attacker.permanentId,
      activated: false,
    });
    await settle(() => h.events.some((e) => e.kind === "blockWindowOpened"));
    h.combat.resolveBlock(1, undefined);
    await resolved;

    const order = h.events.map((e) => e.kind);
    const idxDeclared = order.indexOf("attackDeclared");
    const idxCounter = order.indexOf("counterWindowOpened");
    const idxBlock = order.indexOf("blockWindowOpened");
    expect(idxDeclared).toBeGreaterThanOrEqual(0);
    expect(idxDeclared).toBeLessThan(idxCounter);
    expect(idxCounter).toBeLessThan(idxBlock);
  });

  it("11-3-1: with nothing activatable, no response window is announced and the attack continues", async () => {
    cite(
      "comprehensive-0146",
      "11-3-1 the counter timing is a MAY, not a MUST — mirrors `runBlockWindow`'s 'no eligible " +
        "blocker' shortcut: `runCounterWindow` resolves immediately (no round trip) when " +
        "`hooks.counterEligible` reports nothing activatable, so an attack against a defender with " +
        "no [Counter] effects doesn't hang waiting for a response nobody can give.",
    );

    const h = controllerHarness(); // no counterEligible hook => nothing eligible
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    const opened = h.events.find((e) => e.kind === "counterWindowOpened");
    expect(opened).toBeUndefined();
    expect(h.combat.hasOpenCounterWindow).toBe(false); // resolved without a round trip
  });

  it("11-3-2: the per-attack cap is 1 — activating closes the window, and a second activation this attack is refused", async () => {
    cite(
      "comprehensive-0146",
      "11-3-2 during the counter timing, only 1 [Counter] effect can be activated per attack. " +
        "`CombatController.resolveCounterActivated` closes the window on the first activation (the " +
        "cap is structural: the window never reopens for a second choice within the same attack), " +
        "and `counterActivationsRemaining` reflects the spent cap.",
    );

    const h = controllerHarness({
      counterEligible: () => [{ instanceId: "x", effectKey: "k", description: "test" }],
    });
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    const resolved = h.combat.resolveAttack(0, attacker, { kind: "player" });
    await settle(() => h.combat.hasOpenCounterWindow);
    expect(h.combat.counterActivationsRemaining).toBe(1);

    // Activate the (one) [Counter] effect: closes the window and spends the cap.
    expect(h.combat.resolveCounterActivated(1)).toBe(true);
    expect(h.events).toContainEqual({
      kind: "counterResolved",
      attackerPermanentId: attacker.permanentId,
      activated: true,
    });
    expect(h.combat.hasOpenCounterWindow).toBe(false);
    expect(h.combat.counterActivationsRemaining).toBe(0);

    // A second attempt this attack has no window left to answer — refused.
    expect(h.combat.resolveCounterActivated(1)).toBe(false);
    expect(h.combat.resolveCounterPass(1)).toBe(false);

    await resolved;
  });

  it("11-3-1: a real [Counter] card activates through the window via the respondCounter verb (EX12-033)", async () => {
    cite(
      "comprehensive-0146",
      "11-3-1 the non-turn player's [Counter] effect activates during the counter timing. Driven " +
        "through the real GameEngine: `respondCounter` resolves the chosen [Counter] effect's body " +
        "(effectActivated narrates it) and then closes the window via " +
        "`CombatController.resolveCounterActivated`, so a second respondCounter this attack is " +
        "rejected (§11-3-2's cap enforced end-to-end, not just at the controller layer).",
    );

    const s = setup(
      {
        0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
        // EX12-033 (read from apps/api/src/cards/EX12/EX12-033.ts): "[When Digivolving] [When
        // Attacking] [Counter] You may trash up to 3 cards in your hand. Then, to 1 of your
        // opponent's Digimon, give -4000 DP ... for each card this effect trashed."
        1: { battleArea: [{ card: "EX12-033", dp: 4000, as: "counterCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const counterCard = s.perm("counterCard");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));

    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counterWindowOpened not found");
    expect(opened.defendingSeat).toBe(1);
    const eligible = opened.eligibleCounters.find((c) => c.instanceId === counterCard.topCard!.instanceId);
    expect(eligible, "EX12-033's [Counter] effect must be eligible").toBeDefined();

    const activate = s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: eligible!.instanceId,
      effectKey: eligible!.effectKey,
    });
    expect(activate).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectActivated"));

    const activated = s.events.find((e) => e.kind === "effectActivated");
    if (activated?.kind !== "effectActivated") throw new Error("effectActivated not found");
    expect(activated.sourceCardId).toBe("EX12-033");

    // §11-3-2: the cap is spent — a second respondCounter for the SAME attack is refused.
    const second = s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: eligible!.instanceId,
      effectKey: eligible!.effectKey,
    });
    expect(second.ok).toBe(false);

    await settle(() => s.events.some((e) => e.kind === "combatResolved" || e.kind === "securityChecked"));
  });
});

describe("§11-4 Block Timing (comprehensive-0147)", () => {
  it("11-4-1: the block timing is when the non-turn player may use a ＜Blocker＞ Digimon to block", async () => {
    cite(
      "comprehensive-0147",
      "11-4-1 the block timing is when the non-turn player can use a ＜Blocker＞ Digimon to block",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: BLOCKER_CARD, dp: 1000, as: "blocker" }] },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);

    const opened = s.events.find((e) => e.kind === "blockWindowOpened");
    expect(opened).toMatchObject({ eligibleBlockerIds: [blocker.permanentId] });

    const declare = s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId });
    expect(declare).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blocked"), 5000);
    expect(blocker.isSuspended).toBe(true); // blocking suspends the blocker
  });
});

describe("§11-5 Confirming if an Attack is Successful (comprehensive-0148)", () => {
  it("11-5-1-1: a successful player-directed attack against 1+ security triggers a security check", async () => {
    cite(
      "comprehensive-0148",
      "11-5-1-1/11-5-1-1-1 an attack on the player with 1+ security triggers a security check",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: { security: [DIGIMON_B] },
    });
    const attacker = s.perm("attacker");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "securityChecked"), 5000);
    expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true);
  });

  it("11-5-1-2: a successful player-directed attack against EMPTY security wins the game for the attacker", async () => {
    cite(
      "comprehensive-0148",
      "11-5-1-2/11-5-1-2-1 an attack on a player with 0 security wins the attacker's controller the game",
    );

    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    // p1.security is empty.

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "gameOver"), 5000);
    const over = s.events.find((e) => e.kind === "gameOver");
    expect(over).toMatchObject({ result: { outcome: "win", winnerSeat: 0 }, reason: "security" });
  });

  it("11-5-1-3: a successful attack ON A DIGIMON is a battle between the two Digimon", async () => {
    cite("comprehensive-0148", "11-5-1-3/11-5-1-3-1 a successful attack on a Digimon causes a battle between the two");

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      // Use a Digimon without a top-level end-of-attack prompt so this rules test
      // observes the battle itself rather than stopping on an unrelated card decision.
      1: { battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }] },
    });
    const p1 = s.state.players[1]!;
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"), 5000);
    const resolved = s.events.find((e) => e.kind === "combatResolved");
    expect(resolved).toMatchObject({ seat: 0, deletedPermanentIds: [defender.permanentId] });
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
  });

  it("11-5-1-4: an unsuccessful attack ends without anything happening — no security check, no battle", async () => {
    cite("comprehensive-0148", "11-5-1-4 an unsuccessful attack ends without anything happening");

    const h = controllerHarness({
      fireTiming: async (timing, trigger) => {
        h.firedTimings.push(timing);
        if (timing === EffectTiming.OnUseAttack) {
          h.state.players[0]!.battleArea = h.state.players[0]!.battleArea.filter(
            (pp) => pp.permanentId !== trigger.attackerPermanentId,
          ) as never; // the attacker is deleted before it can succeed
        }
      },
    });
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);
    h.state.players[1]!.security.push(new CardInstance());

    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    expect(h.events.some((e) => e.kind === "securityChecked")).toBe(false);
    expect(h.events.some((e) => e.kind === "combatResolved")).toBe(false);
    expect(h.events.some((e) => e.kind === "gameOver")).toBe(false);
    expect(h.firedTimings).toContain(EffectTiming.OnEndAttack); // still reaches end-of-attack (§11-6)
  });
});

describe("§11-6 End of Attack (comprehensive-0149)", () => {
  it("11-6-1: every attack — successful or not — reaches the end-of-attack timing exactly once", async () => {
    cite("comprehensive-0149", "11-6-1 the end of attack timing arrives and the attack ends");

    const h = controllerHarness();
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    const endCount = h.firedTimings.filter((t) => t === EffectTiming.OnEndAttack).length;
    expect(endCount).toBe(1);
  });

  it("11-6-2: the attack-in-progress flag drops only once end-of-attack processing has fully resolved", async () => {
    cite("comprehensive-0149", "11-6-2 the end of attack timing won't end until all processing has been resolved");

    let sawIsAttackingDuringEnd = false;
    const h = controllerHarness({
      fireTiming: async (timing) => {
        h.firedTimings.push(timing);
        if (timing === EffectTiming.OnEndAttack) {
          sawIsAttackingDuringEnd = h.combat.isAttacking; // still "attacking" WHILE end-of-attack resolves
        }
      },
    });
    const attacker = makePermanent(0, 9000);
    h.state.players[0]!.battleArea.push(attacker);

    expect(h.combat.isAttacking).toBe(false);
    await h.combat.resolveAttack(0, attacker, { kind: "player" });

    expect(sawIsAttackingDuringEnd).toBe(true);
    expect(h.combat.isAttacking).toBe(false); // dropped only after resolveAttack's finally-cleanup
  });
});

// Sanity: `applyAttack`/`validateAttack` are exercised through the real GameEngine above via
// `applyIntent`; this confirms the pure `actions/attack.ts` exports used there compose the same
// way when called directly (a structural cross-check, not a duplicate behavioral claim).
describe("§11 Attacking — direct validateAttack/applyAttack sanity", () => {
  it("rejects a Main-phase-only verb outside the Main phase", () => {
    const s = setup({ 0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] } });
    const attacker = s.perm("attacker");
    s.state.phase = Phase.Breeding;
    const deps = {
      state: s.state,
      access: new GameStateAccess(s.state),
      combat: (s.engine as unknown as { combat: CombatController }).combat,
      onCombatError: () => {},
    };
    expect(validateAttack(deps, 0, { attackerPermanentId: attacker.permanentId, target: { kind: "player" } })).toBe(
      "wrong-phase",
    );
    expect(applyAttack(deps, 0, { attackerPermanentId: attacker.permanentId, target: { kind: "player" } })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
  });
});
