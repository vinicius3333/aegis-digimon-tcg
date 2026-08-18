import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { WinCheck } from "./winCheck.js";
import {
  runSecurityCheck,
  type SecurityCheckDeps,
  type SecurityCheckAttacker,
} from "./securityCheck.js";

const ATTACKER_ID = "attacker-1";

function makeSecurityCard(seat: Seat, n: number, cardId = "OPTION-X"): CardInstance {
  const card = new CardInstance();
  card.instanceId = `sec-${seat}-${n}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = false; // face-down in security
  return card;
}

/** GameState with a defender (seat 1) holding `securityCardIds.length` security
 * cards and an attacker permanent controlled by seat 0. */
function makeState(securityCards: CardInstance[]): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const defender = state.players[1];
  if (defender) for (const c of securityCards) defender.security.push(c);

  const attacker = new Permanent();
  attacker.permanentId = ATTACKER_ID;
  attacker.controllerSeat = 0;
  const top = new CardInstance();
  top.instanceId = "attacker-top";
  top.cardId = "BT15-002";
  top.ownerSeat = 0;
  attacker.topCard = top;
  state.players[0]?.battleArea.push(attacker);
  return state;
}

interface Harness {
  state: GameState;
  win: WinCheck;
  events: ServerEvent[];
  deps: SecurityCheckDeps;
  deleted: string[][];
  firedTimings: EffectTiming[];
}

/** Build a default harness; `overrides` patch the deps for a specific scenario. */
function harness(securityCards: CardInstance[], overrides: Partial<SecurityCheckDeps> = {}): Harness {
  const state = makeState(securityCards);
  const events: ServerEvent[] = [];
  const win = new WinCheck(state, (e) => events.push(e));
  const deleted: string[][] = [];
  const firedTimings: EffectTiming[] = [];

  const attackerLives = (): boolean =>
    state.players[0]?.battleArea.some((p) => p.permanentId === ATTACKER_ID) ?? false;

  const deps: SecurityCheckDeps = {
    strikeFor: () => 1,
    permanentById: (id) =>
      id === ATTACKER_ID && attackerLives()
        ? state.players[0]?.battleArea.find((p) => p.permanentId === id)
        : undefined,
    fireTiming: async (timing) => {
      firedTimings.push(timing);
    },
    resolveSecurityEffect: async () => false,
    dpOf: () => 5000,
    securityCardDp: () => 3000,
    isDigimon: () => false,
    deletePermanents: async (ids) => {
      deleted.push(ids);
      // emulate the deletion mutating the field so the attacker leaves play
      const ba = state.players[0]?.battleArea;
      if (ba) {
        for (const id of ids) {
          const idx = ba.findIndex((p) => p.permanentId === id);
          if (idx >= 0) ba.splice(idx, 1);
        }
      }
    },
    ...overrides,
  };

  return { state, win, events, deps, deleted, firedTimings };
}

const attacker: SecurityCheckAttacker = { permanentId: ATTACKER_ID };

describe("runSecurityCheck", () => {
  it("empty security + landing attack => the attacker's controller wins", async () => {
    const h = harness([]);
    await runSecurityCheck(h.state, h.events.push.bind(h.events), h.win, h.deps, 1, attacker);

    expect(h.state.gameOver).toBe(true);
    expect(h.state.winnerSeat).toBe(0); // attacker controller
    expect(h.events.some((e) => e.kind === "gameOver" && e.reason === "security")).toBe(true);
  });

  it("Strike 0 => no check at all (no flips, no game over)", async () => {
    const card = makeSecurityCard(1, 0);
    const h = harness([card], { strikeFor: () => 0 });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(card.faceUp).toBe(false);
    expect(h.state.players[1]?.security).toHaveLength(1);
    expect(h.state.gameOver).toBe(false);
  });

  it("non-Digimon, no security effect => revealed, removed, trashed", async () => {
    const card = makeSecurityCard(1, 0, "OPTION-X");
    const emitted: ServerEvent[] = [];
    const h = harness([card]);
    await runSecurityCheck(h.state, (e) => emitted.push(e), h.win, h.deps, 1, attacker);

    expect(card.faceUp).toBe(true);
    expect(h.state.players[1]?.security).toHaveLength(0);
    expect(h.state.players[1]?.trash.map((c) => c.instanceId)).toContain(card.instanceId);
    expect(emitted).toContainEqual({
      kind: "securityChecked",
      seat: 1,
      revealedCardId: "OPTION-X",
      resolution: "trashed",
    });
    // OnSecurityCheck fires before removal, OnLoseSecurity after.
    expect(h.firedTimings).toEqual([EffectTiming.OnSecurityCheck, EffectTiming.OnLoseSecurity]);
  });

  it("a Security Digimon still battles after resolving its [Security] effect", async () => {
    const card = makeSecurityCard(1, 0, "SEC-EFFECT");
    const emitted: ServerEvent[] = [];
    const h = harness([card], {
      resolveSecurityEffect: async () => true,
      isDigimon: () => true,
    });
    await runSecurityCheck(h.state, (e) => emitted.push(e), h.win, h.deps, 1, attacker);

    expect(emitted).toContainEqual({
      kind: "securityChecked",
      seat: 1,
      revealedCardId: "SEC-EFFECT",
      resolution: "battle",
    });
  });

  it("security Digimon with lower DP => attacker survives, security trashed", async () => {
    const card = makeSecurityCard(1, 0, "DIGI-WEAK");
    const h = harness([card], {
      isDigimon: () => true,
      dpOf: () => 6000,
      securityCardDp: () => 3000,
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.deleted).toHaveLength(0); // attacker not deleted
    expect(h.state.players[1]?.trash.map((c) => c.instanceId)).toContain(card.instanceId);
    expect(h.state.players[0]?.battleArea).toHaveLength(1); // attacker still in play
  });

  it("security Digimon with higher DP => attacker is deleted, security trashed", async () => {
    const card = makeSecurityCard(1, 0, "DIGI-STRONG");
    const h = harness([card], {
      isDigimon: () => true,
      dpOf: () => 2000,
      securityCardDp: () => 9000,
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.deleted).toEqual([[ATTACKER_ID]]);
    expect(h.state.players[1]?.trash.map((c) => c.instanceId)).toContain(card.instanceId);
  });

  it("whenSecurityRemoved fires with the attacker still in play, before the battle", async () => {
    // CR 13-1-6/13-1-8-3 + KB Q6085: the checked card leaves the security stack (and its
    // watchers run) at the check; the battle is the LATER step. So an attacker deleted by
    // a stronger Security Digimon still fires its removal watchers — e.g. BT14-001's
    // inherited "[Your Turn][Once Per Turn] when a card is removed from your opponent's
    // security stack, ＜Draw 1＞".
    const card = makeSecurityCard(1, 0, "DIGI-STRONG");
    const attackerAliveWhenRemovedFired: boolean[] = [];
    const h = harness([card], {
      isDigimon: () => true,
      dpOf: () => 2000,
      securityCardDp: () => 9000,
    });
    h.deps.fireSubTrigger = async (event) => {
      if (event !== "whenSecurityRemoved") return;
      attackerAliveWhenRemovedFired.push(h.deps.permanentById(ATTACKER_ID) !== undefined);
    };
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(attackerAliveWhenRemovedFired).toEqual([true]);
    expect(h.deleted).toEqual([[ATTACKER_ID]]); // the battle still deletes it afterwards
  });

  it("whenSecurityRemoved does not fire for an attacker removed by the [Security] effect", async () => {
    // KB Q2611/Q2629: a [Security] effect resolves BEFORE the removal watchers, so a
    // source it removes from the battle area never sees the removal.
    const card = makeSecurityCard(1, 0, "SEC-BLAST");
    const h = harness([card], {
      resolveSecurityEffect: async () => {
        const ba = h.state.players[0]?.battleArea;
        if (ba) ba.length = 0;
        return true;
      },
    });
    const attackerAliveWhenRemovedFired: boolean[] = [];
    h.deps.fireSubTrigger = async (event) => {
      if (event !== "whenSecurityRemoved") return;
      attackerAliveWhenRemovedFired.push(h.deps.permanentById(ATTACKER_ID) !== undefined);
    };
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(attackerAliveWhenRemovedFired).toEqual([false]);
  });

  it("equal DP => tie: attacker deleted AND security trashed", async () => {
    const card = makeSecurityCard(1, 0, "DIGI-EQUAL");
    const h = harness([card], {
      isDigimon: () => true,
      dpOf: () => 5000,
      securityCardDp: () => 5000,
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.deleted).toEqual([[ATTACKER_ID]]);
    expect(h.state.players[1]?.trash.map((c) => c.instanceId)).toContain(card.instanceId);
  });

  it("Strike 2 checks two security cards in top-first order", async () => {
    const top = makeSecurityCard(1, 0, "TOP");
    const next = makeSecurityCard(1, 1, "NEXT");
    const order: string[] = [];
    const h = harness([top, next], {
      strikeFor: () => 2,
      resolveSecurityEffect: async (c) => {
        order.push(c.cardId);
        return false;
      },
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(order).toEqual(["TOP", "NEXT"]);
    expect(h.state.players[1]?.security).toHaveLength(0);
    expect(h.state.players[1]?.trash).toHaveLength(2);
  });

  it("stops early when the attacker leaves play mid-check", async () => {
    const top = makeSecurityCard(1, 0, "TOP");
    const next = makeSecurityCard(1, 1, "NEXT");
    // First card is a stronger Digimon: deleting the attacker ends the loop, so
    // the second security card is never checked.
    const h = harness([top, next], {
      strikeFor: () => 2,
      isDigimon: () => true,
      dpOf: () => 1000,
      securityCardDp: () => 9000,
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.deleted).toEqual([[ATTACKER_ID]]);
    expect(h.state.players[1]?.security.map((c) => c.instanceId)).toEqual([next.instanceId]);
    expect(h.state.players[1]?.trash.map((c) => c.instanceId)).toEqual([top.instanceId]);
  });
});
