import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { GameStateAccess } from "../state/access.js";
import { CombatController, type CombatHooks } from "../combat/controller.js";
import { canBlock } from "../combat/legality.js";
import { setupEngine as setup, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 12 "Blocking" (comprehensive-0139-adjacent ids aside — the
 * real chapter-12 range is comprehensive-0150-0151).
 *
 * comprehensive-0150 (bare chapter heading) and the TOC dot-leader entry
 * (comprehensive-0012) carry no normative content and are seeded in `not-testable.ts`; the
 * real content chunk is comprehensive-0151.
 */

const DIGIMON_A = "AD1-001";
const BLOCKER_CARD = "ST18-07"; // real card printed exactly "＜Blocker＞." (Comprehensive Rules §16-5)

let seq = 0;
function makePermanent(seat: Seat, dp: number, opts: { suspended?: boolean; cardId?: string } = {}): Permanent {
  seq += 1;
  const top = new CardInstance();
  top.instanceId = `ch12-inst-${seq}`;
  top.cardId = opts.cardId ?? DIGIMON_A;
  top.ownerSeat = seat;
  top.faceUp = true;
  const permanent = new Permanent();
  permanent.permanentId = `ch12-perm-${seq}`;
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

describe("§12-1 Blocking (comprehensive-0151)", () => {
  it("12-1-1: a block switches the attack target onto the blocking Digimon", async () => {
    cite(
      "comprehensive-0151",
      "12-1-1 a block switches the attack target to a Digimon with ＜Blocker＞ in the battle area",
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
    const declare = s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId });
    expect(declare).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"), 5000);

    // The battle resolved against the BLOCKER (attacker DP 9000 > blocker DP 1000), not a
    // player-directed security check — proving the target actually switched.
    expect(s.events.some((e) => e.kind === "securityChecked")).toBe(false);
    const resolved = s.events.find((e) => e.kind === "combatResolved");
    expect(resolved).toMatchObject({ deletedPermanentIds: [blocker.permanentId] });
  });

  it("12-1-2/12-1-3: a block can only be performed once per attack — a second declareBlock against the same window is rejected", async () => {
    cite(
      "comprehensive-0151",
      "12-1-2 a block can only be performed once per attack, multiple Digimon can't block at " +
        "the same time; 12-1-3 a new block declaration can't be made during a block",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: {
        battleArea: [
          { card: BLOCKER_CARD, dp: 1000, as: "blockerA" },
          { card: BLOCKER_CARD, dp: 1000, as: "blockerB" },
        ],
      },
    });
    const attacker = s.perm("attacker");
    const blockerA = s.perm("blockerA");
    const blockerB = s.perm("blockerB");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);
    const first = s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerA.permanentId });
    expect(first).toEqual({ ok: true });

    // The window is now closed (resolved with blockerA); a second declareBlock this same attack
    // is rejected outright — there's no open window left to answer.
    const second = s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerB.permanentId });
    expect(second).toEqual({ ok: false, reason: "wrong-phase" });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"), 5000);
    expect(blockerB.isSuspended).toBe(false); // never suspended — it never actually blocked
  });

  it("12-1-4: a suspended Digimon (one that can't suspend again) can't block", () => {
    cite("comprehensive-0151", "12-1-4 a block can't be performed using a Digimon that can't suspend");

    const state = bareState();
    const access = new GameStateAccess(state);
    const attacker = makePermanent(0, 9000);
    const suspendedBlocker = makePermanent(1, 1000, { suspended: true, cardId: BLOCKER_CARD });
    state.players[0]!.battleArea.push(attacker);
    state.players[1]!.battleArea.push(suspendedBlocker);

    expect(canBlock(access, attacker, suspendedBlocker)).toBe("illegal-target");
    // The same Digimon, unsuspended, is a legal blocker — isolating suspension as the cause.
    suspendedBlocker.isSuspended = false;
    expect(canBlock(access, attacker, suspendedBlocker)).toBeNull();
  });

  it("12-1-6: a block can only be performed if the attacking Digimon is (still) in the battle area", () => {
    cite("comprehensive-0151", "12-1-6 a block can only be performed if an attacking Digimon is in the battle area");

    const state = bareState();
    const access = new GameStateAccess(state);
    const attacker = makePermanent(0, 9000);
    const blocker = makePermanent(1, 1000, { cardId: BLOCKER_CARD });
    state.players[1]!.battleArea.push(blocker);
    // Deliberately NOT pushed to state.players[0]!.battleArea — the attacker is not (or is no
    // longer) a live battle-area Digimon.
    expect(canBlock(access, attacker, blocker)).toBe("illegal-target");

    // The same blocker against a real battle-area attacker is legal — isolating "the attacker
    // must be in the battle area" as the actual cause of the rejection above.
    state.players[0]!.battleArea.push(attacker);
    expect(canBlock(access, attacker, blocker)).toBeNull();
  });

  it("12-1-7-1: declaring a block suspends the chosen blocking Digimon", async () => {
    cite(
      "comprehensive-0151",
      "12-1-7-1 the player makes a block declaration and suspends 1 of their battle-area Digimon to block",
    );

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: { battleArea: [{ card: BLOCKER_CARD, dp: 1000, as: "blocker" }] },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");
    expect(blocker.isSuspended).toBe(false);

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);
    s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId });
    await settle(() => blocker.isSuspended, 5000);
    expect(blocker.isSuspended).toBe(true);
  });

  it("declining the block window is legal, and leaves the attack directed at its original target", async () => {
    cite("comprehensive-0151", "12-1 a block is optional — declining it lets the original attack proceed");

    const s = setup({
      0: { battleArea: [{ card: DIGIMON_A, dp: 9000, as: "attacker" }] },
      1: {
        battleArea: [{ card: BLOCKER_CARD, dp: 1000, as: "blocker" }],
        security: [DIGIMON_A],
      },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"), 5000);
    const decline = s.engine.applyIntent(1, { type: "declineBlock" });
    expect(decline).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "securityChecked"), 5000);

    expect(blocker.isSuspended).toBe(false); // never suspended — it didn't block
    expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true); // original (player) target still applies
  });
});

// --- small local helpers (controller-level; mirror combat/controller.test.ts's own shape) -----

interface ControllerHarness {
  state: GameState;
  access: GameStateAccess;
  combat: CombatController;
  events: { kind: string }[];
}

function controllerHarness(extra?: Partial<CombatHooks>): ControllerHarness {
  const state = bareState();
  const access = new GameStateAccess(state);
  const events: { kind: string }[] = [];
  const hooks: CombatHooks = {
    emit: (e) => events.push(e),
    fireTiming: async () => {},
    checkSecurity: async () => {},
    ...extra,
  };
  return { state, access, combat: new CombatController(access, hooks), events };
}
