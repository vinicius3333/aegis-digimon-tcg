import { describe, it, expect } from "vitest";
import {
  CardInstance,
  GameState,
  Permanent,
  PlayerState,
  combatWindowKey,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { GameStateAccess } from "../state/access.js";
import { CombatController, type CombatHooks } from "./controller.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * GameState.combatWindow — the synchronized mirror of the open combat prompt
 * (subsystem: attack-and-block).
 *
 * The five prompt events are plain channel broadcasts, and Colyseus never redelivers a message
 * to a socket that was down when it was sent: a player who drops during a block/counter/
 * alliance/evade/barrier window used to come back to a match parked forever on an unresolved
 * promise. The mirror is what a fresh state sync carries, and `expireCombatWindow` is the
 * backstop for an answer that never arrives at all.
 */

const DIGIMON_A = "AD1-001";
const BLOCKER_CARD = "ST18-07"; // printed text is exactly "＜Blocker＞."

function blockWindowBoard() {
  return setupEngine({
    0: { battleArea: [{ card: DIGIMON_A, dp: 5000, as: "attacker" }] },
    1: { battleArea: [{ card: BLOCKER_CARD, dp: 3000, as: "blocker" }], security: [DIGIMON_A] },
  });
}

describe("combat window state mirror", () => {
  it("mirrors the open block window for the defending seat and clears it when answered", async () => {
    const s = blockWindowBoard();
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow !== undefined, 3000);

    const window = s.state.combatWindow!;
    expect(window.kind).toBe("block");
    expect(window.seat).toBe(1);
    expect(window.attackerPermanentId).toBe(attacker.permanentId);
    expect([...window.eligiblePermanentIds]).toContain(blocker.permanentId);
    expect(combatWindowKey(window)).toBe(`block:${attacker.permanentId}`);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    expect(s.state.combatWindow).toBeUndefined();
  });

  it("keeps the window answerable after the defending seat drops and reconnects", async () => {
    const s = blockWindowBoard();
    const attacker = s.perm("attacker");

    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } });
    await settle(() => s.state.combatWindow !== undefined, 3000);

    // The drop and resume a room performs around `allowReconnection`. The mirror is
    // synchronized state, so it survives both and the resumed client can still answer.
    s.engine.handleDisconnect(1, false);
    s.engine.handleReconnect(1);

    expect(s.state.combatWindow?.kind).toBe("block");
    expect(s.state.combatWindow?.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    expect(s.state.combatWindow).toBeUndefined();
  });

  it("expireCombatWindow closes an unanswered block window at the safe default", async () => {
    const s = blockWindowBoard();
    const attacker = s.perm("attacker");

    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } });
    await settle(() => s.state.combatWindow !== undefined, 3000);

    expect(s.engine.expireCombatWindow()).toBe(true);
    expect(s.state.combatWindow).toBeUndefined();
    // The safe default is a pass, so the attack carries on into security rather than stalling.
    expect(s.events.some((e) => e.kind === "blockDeclined")).toBe(true);
    await settle(() => s.events.some((e) => e.kind === "securityChecked"), 3000);

    // Nothing is left open to expire a second time.
    expect(s.engine.expireCombatWindow()).toBe(false);
  });
});

/** A controller over a bare two-seat state, for the keyword prompts that need no board. */
function keywordHarness() {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const permanent = new Permanent();
  permanent.permanentId = "perm-1";
  permanent.controllerSeat = 1;
  permanent.topCard = new CardInstance();
  permanent.topCard.instanceId = "inst-1";
  permanent.topCard.cardId = DIGIMON_A;
  permanent.topCard.faceUp = true;
  state.players[1]!.battleArea.push(permanent);

  const events: ServerEvent[] = [];
  const hooks: CombatHooks = {
    emit: (event) => events.push(event),
    fireTiming: async () => {},
    checkSecurity: async () => {},
  };
  return { state, combat: new CombatController(new GameStateAccess(state), hooks), hooks, events, permanent };
}

describe("keyword prompt mirrors", () => {
  it("mirrors an ＜Evade＞ prompt and clears it on the answer", async () => {
    const h = keywordHarness();
    const answered = h.combat.runEvadeDecision(1, h.permanent.permanentId);

    expect(h.state.combatWindow?.kind).toBe("evade");
    expect(h.state.combatWindow?.seat).toBe(1);
    expect(combatWindowKey(h.state.combatWindow!)).toBe("evade:perm-1");

    expect(h.combat.resolveEvade(1, h.permanent.permanentId, true)).toBe(true);
    expect(h.state.combatWindow).toBeUndefined();
    expect(await answered).toBe(true);
  });

  it("mirrors a ＜Barrier＞ prompt and expires it to a decline", async () => {
    const h = keywordHarness();
    const answered = h.combat.runBarrierDecision(1, h.permanent.permanentId);

    expect(h.state.combatWindow?.kind).toBe("barrier");
    expect(h.combat.expireOpenWindow()).toBe(true);
    expect(h.state.combatWindow).toBeUndefined();
    // Declining is the safe default: the prevention cost is never paid on the player's behalf.
    expect(await answered).toBe(false);
    expect(h.events.some((e) => e.kind === "barrierResolved" && e.accepted === false)).toBe(true);
  });
});

describe("terminal combat cancellation", () => {
  it("silently releases a real block wait without checking security after the outcome", async () => {
    const s = blockWindowBoard();
    const attacker = s.perm("attacker");
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } });
    await settle(() => s.state.combatWindow?.kind === "block", 3000);
    const securityBefore = s.state.players[1]!.security.length;
    s.engine.win.declareLoss(1, "timeout");
    const eventCount = s.events.length;
    s.engine.combat.cancel();
    expect(s.state.combatWindow).toBeUndefined();
    expect(s.engine.combat.expireOpenWindow()).toBe(false);
    await settle(() => !s.engine.combat.isAttacking, 3000);
    expect(s.state.players[1]!.security.length).toBe(securityBefore);
    expect(s.events.slice(eventCount)).toEqual([]);
  });

  for (const keyword of ["Evade", "Barrier"] as const) {
    it(`stops a real battle parked on ${keyword} without deleting either Digimon`, async () => {
      const h = keywordHarness();
      const attacker = new Permanent();
      attacker.permanentId = "attacker";
      attacker.controllerSeat = 0;
      attacker.topCard = new CardInstance();
      attacker.topCard.cardId = DIGIMON_A;
      attacker.topCard.instanceId = "attacker-card";
      attacker.currentDP = 6000;
      h.permanent.currentDP = 3000;
      h.state.players[0]!.battleArea.push(attacker);
      h.state.players[1]!.security.push(new CardInstance());
      h.hooks.hasKeyword = (id, name) => id === h.permanent.permanentId && name === keyword;
      const battle = h.combat.resolveBattle(attacker, h.permanent);
      await settle(() => h.state.combatWindow?.kind === keyword.toLowerCase(), 3000);
      h.state.gameOver = true;
      const eventCount = h.events.length;
      h.combat.cancel();
      await battle;
      expect(h.state.combatWindow).toBeUndefined();
      expect(h.combat.expireOpenWindow()).toBe(false);
      expect(h.state.players[0]!.battleArea).toContain(attacker);
      expect(h.state.players[1]!.battleArea).toContain(h.permanent);
      expect(h.state.players[1]!.security).toHaveLength(1);
      expect(h.events.slice(eventCount)).toEqual([]);
    });
  }
});
