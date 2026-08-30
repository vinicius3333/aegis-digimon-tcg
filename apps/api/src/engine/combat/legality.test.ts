import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat } from "@aegis/shared";
import { GameStateAccess } from "../state/access.js";
import { canAttackerDeclare, canAttackTarget, canBlock, eligibleBlockers } from "./legality.js";

// Real card ids from the generated data: AD1-001/AD1-002 are Digimon; AD1-019 is
// a pure Tamer (no DP, never a Digimon). DP for combat is read from the schema's
// currentDP, so the cards' own DP values are irrelevant to these legality tests.
const DIGIMON_A = "AD1-001";
const DIGIMON_B = "AD1-002";
const TAMER = "AD1-019";
// BT25-053 carries the printed ＜Vortex＞ keyword in its effectText; AD1-001 does not. Used to
// exercise the base ＜Vortex＞ attack subsystem (Digimon-only target unless a grant relaxes it).
const VORTEX_DIGIMON = "BT25-053";

let seq = 0;
function digimonPermanent(seat: Seat, cardId: string, opts: { suspended?: boolean; dp?: number } = {}): Permanent {
  seq += 1;
  const top = new CardInstance();
  top.instanceId = `inst-${seq}`;
  top.cardId = cardId;
  top.ownerSeat = seat;
  top.faceUp = true;

  const permanent = new Permanent();
  permanent.permanentId = `perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = top;
  permanent.isSuspended = opts.suspended ?? false;
  permanent.inBreeding = false;
  permanent.enterFieldTurnCount = -1; // already-on-field sentinel (not this turn)
  permanent.baseDP = opts.dp ?? 1000;
  permanent.currentDP = opts.dp ?? 1000;
  return permanent;
}

function makeState(): { state: GameState; access: GameStateAccess } {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return { state, access: new GameStateAccess(state) };
}

describe("canAttackerDeclare", () => {
  it("allows an already-suspended attacker when the effect attacks without suspending", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    attacker.isSuspended = true;
    state.players[0]?.battleArea.push(attacker);

    expect(canAttackerDeclare(access, 0, attacker)).toBe("illegal-target");
    expect(canAttackerDeclare(access, 0, attacker, undefined, false, true)).toBeNull();
  });

  it("accepts an own, unsuspended battle-area Digimon", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackerDeclare(access, 0, attacker)).toBeNull();
  });

  it("lets an explicit effect-driven attack bypass summoning sickness without relaxing ordinary attacks", () => {
    const { state, access } = makeState();
    state.turnCount = 1;
    const attacker = digimonPermanent(0, DIGIMON_A);
    attacker.enterFieldTurnCount = state.turnCount;
    state.players[0]?.battleArea.push(attacker);

    expect(canAttackerDeclare(access, 0, attacker)).toBe("illegal-target");
    expect(canAttackerDeclare(access, 0, attacker, undefined, false, false, true)).toBeNull();
  });

  it("rejects a suspended attacker", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackerDeclare(access, 0, attacker)).toBe("illegal-target");
  });

  it("rejects attacking with the opponent's permanent", () => {
    const { state, access } = makeState();
    const enemy = digimonPermanent(1, DIGIMON_A);
    state.players[1]?.battleArea.push(enemy);
    // Seat 0 tries to attack with seat 1's permanent.
    expect(canAttackerDeclare(access, 0, enemy)).toBe("illegal-target");
  });

  it("rejects a Tamer (not a Digimon)", () => {
    const { state, access } = makeState();
    const tamer = digimonPermanent(0, TAMER);
    state.players[0]?.battleArea.push(tamer);
    expect(canAttackerDeclare(access, 0, tamer)).toBe("illegal-target");
  });
});

describe("canAttackTarget", () => {
  it("always allows a player-directed attack", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackTarget(access, 0, attacker, { kind: "player" })).toBeNull();
  });

  it("allows attacking an opponent's SUSPENDED Digimon", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const defender = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(defender);
    expect(canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: defender.permanentId })).toBeNull();
  });

  it("rejects attacking an opponent's UNSUSPENDED Digimon", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const defender = digimonPermanent(1, DIGIMON_B, { suspended: false });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(defender);
    expect(canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: defender.permanentId })).toBe(
      "illegal-target",
    );
  });

  it("rejects attacking your own Digimon", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const friendly = digimonPermanent(0, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker, friendly);
    expect(canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: friendly.permanentId })).toBe(
      "illegal-target",
    );
  });

  it("rejects an unknown target permanent", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: "nope" })).toBe("illegal-target");
  });
});

describe("canBlock / eligibleBlockers", () => {
  it("an unsuspended opponent Digimon may block", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const blocker = digimonPermanent(1, DIGIMON_B, { suspended: false });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(blocker);
    expect(canBlock(access, attacker, blocker)).toBeNull();
    expect(eligibleBlockers(access, attacker).map((p) => p.permanentId)).toEqual([blocker.permanentId]);
  });

  it("a suspended Digimon cannot block", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const blocker = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(blocker);
    expect(canBlock(access, attacker, blocker)).toBe("illegal-target");
    expect(eligibleBlockers(access, attacker)).toHaveLength(0);
  });

  it("a Tamer cannot block", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const tamer = digimonPermanent(1, TAMER);
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(tamer);
    expect(canBlock(access, attacker, tamer)).toBe("illegal-target");
  });

  it("an own Digimon is not an eligible blocker for your own attacker", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const friendly = digimonPermanent(0, DIGIMON_B);
    state.players[0]?.battleArea.push(attacker, friendly);
    expect(canBlock(access, attacker, friendly)).toBe("illegal-target");
    expect(eligibleBlockers(access, attacker)).toHaveLength(0);
  });
});

describe("legality reads the continuous ledger (restrictions + ＜Blocker＞)", () => {
  /** A minimal ContinuousLegalityReader over explicit restriction/keyword sets. */
  function reader(opts: {
    restrictions?: [string, string][];
    attackTargetRestrictions?: [string, string][];
    keywords?: [string, string][];
    vortexCanAttackPlayers?: string[];
  }): {
    hasRestriction: (p: string, r: string) => boolean;
    hasKeyword: (p: string, k: string) => boolean;
    vortexCanAttackPlayers: (p: string) => boolean;
    cannotAttackTarget: (attacker: string, target: string) => boolean;
  } {
    const rs = new Set((opts.restrictions ?? []).map(([p, r]) => `${p}|${r}`));
    const ks = new Set((opts.keywords ?? []).map(([p, k]) => `${p}|${k}`));
    const vp = new Set(opts.vortexCanAttackPlayers ?? []);
    const atr = new Set((opts.attackTargetRestrictions ?? []).map(([a, t]) => `${a}|${t}`));
    return {
      hasRestriction: (p, r) => rs.has(`${p}|${r}`),
      hasKeyword: (p, k) => ks.has(`${p}|${k}`),
      vortexCanAttackPlayers: (p) => vp.has(p),
      cannotAttackTarget: (a, t) => atr.has(`${a}|${t}`),
    };
  }

  it("a 'can't attack' restriction blocks the attack declaration", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    state.players[0]?.battleArea.push(attacker);
    const r = reader({ restrictions: [[attacker.permanentId, "attack"]] });
    expect(canAttackerDeclare(access, 0, attacker, r as never)).toBe("illegal-target");
    // Same attacker without the restriction is legal.
    expect(canAttackerDeclare(access, 0, attacker, reader({}) as never)).toBeNull();
  });

  it("a 'can't attack players' restriction blocks only a player-directed attack", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const enemy = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(enemy);
    const r = reader({ restrictions: [[attacker.permanentId, "attackPlayers"]] });
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, r as never)).toBe("illegal-target");
    // It can still attack a suspended Digimon.
    expect(
      canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: enemy.permanentId }, r as never),
    ).toBeNull();
  });

  it("a 'can't attack Digimon' restriction blocks only Digimon-directed attacks", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const enemy = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(enemy);
    const r = reader({ restrictions: [[attacker.permanentId, "cantAttackDigimon"]] });
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, r as never)).toBeNull();
    expect(
      canAttackTarget(access, 0, attacker, { kind: "permanent", permanentId: enemy.permanentId }, r as never),
    ).toBe("illegal-target");
  });

  it("a 'can't be attacked' restriction on the defender forbids targeting it", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const enemy = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(enemy);
    const target = { kind: "permanent", permanentId: enemy.permanentId } as const;
    const r = reader({ restrictions: [[enemy.permanentId, "cantBeAttacked"]] });
    expect(canAttackTarget(access, 0, attacker, target, r as never)).toBe("illegal-target");
    // Without the restriction the suspended Digimon is a legal target.
    expect(canAttackTarget(access, 0, attacker, target, reader({}) as never)).toBeNull();
  });

  it("a target-scoped restriction blocks only that attacker-defender pair", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const restricted = digimonPermanent(1, DIGIMON_B, { suspended: true });
    const other = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(restricted, other);
    const r = reader({
      attackTargetRestrictions: [[attacker.permanentId, restricted.permanentId]],
    });

    expect(canAttackerDeclare(access, 0, attacker, r as never)).toBeNull();
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, r as never)).toBeNull();
    expect(
      canAttackTarget(
        access,
        0,
        attacker,
        {
          kind: "permanent",
          permanentId: restricted.permanentId,
        },
        r as never,
      ),
    ).toBe("illegal-target");
    expect(
      canAttackTarget(
        access,
        0,
        attacker,
        {
          kind: "permanent",
          permanentId: other.permanentId,
        },
        r as never,
      ),
    ).toBeNull();
  });

  it("with a reader, only a Digimon with ＜Blocker＞ (granted) may block", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const blocker = digimonPermanent(1, DIGIMON_B); // AD1-002 has no printed ＜Blocker＞
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(blocker);

    // No ＜Blocker＞: rejected once the reader is consulted.
    expect(canBlock(access, attacker, blocker, reader({}) as never)).toBe("illegal-target");
    expect(eligibleBlockers(access, attacker, reader({}) as never)).toHaveLength(0);

    // Granted ＜Blocker＞: now eligible.
    const r = reader({ keywords: [[blocker.permanentId, "Blocker"]] });
    expect(canBlock(access, attacker, blocker, r as never)).toBeNull();
    expect(eligibleBlockers(access, attacker, r as never).map((p) => p.permanentId)).toEqual([blocker.permanentId]);
  });

  it("an 'attack target can't change' restriction on the ATTACKER forbids every block", () => {
    // A block IS an attack-target switch (§12-1-1), so LM-039's "[Your Turn] This Digimon's
    // attack target can't change" stops the opponent blocking it. The restriction sits on the
    // attacker, not the blocker.
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const blocker = digimonPermanent(1, DIGIMON_B);
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(blocker);

    const granted = { keywords: [[blocker.permanentId, "Blocker"]] as [string, string][] };
    expect(canBlock(access, attacker, blocker, reader(granted) as never)).toBeNull();

    const restricted = reader({
      ...granted,
      restrictions: [[attacker.permanentId, "attackTargetChange"]],
    });
    expect(canBlock(access, attacker, blocker, restricted as never)).toBe("illegal-target");
    expect(eligibleBlockers(access, attacker, restricted as never)).toHaveLength(0);
  });

  it("a 'can't block' restriction overrides a granted ＜Blocker＞", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A);
    const blocker = digimonPermanent(1, DIGIMON_B);
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(blocker);
    const r = reader({
      keywords: [[blocker.permanentId, "Blocker"]],
      restrictions: [[blocker.permanentId, "block"]],
    });
    expect(canBlock(access, attacker, blocker, r as never)).toBe("illegal-target");
  });
});

// The base ＜Vortex＞ attack subsystem (Comprehensive Rules §16-33; documented behavior the effect runtime.VortexProcess
// attack declaration (intent.vortex === true) targets opponent DIGIMON only; a player target is
// illegal unless a VortexCanAttackPlayers grant relaxes it. This is the CONSUME site for the
// otherwise-inert ＜Vortex＞ keyword — without it the keyword grant would be a dead store (INRT-01).
describe("base ＜Vortex＞ attack subsystem (keyword consume site)", () => {
  function reader(opts: { keywords?: [string, string][]; vortexCanAttackPlayers?: string[] }): {
    hasRestriction: (p: string, r: string) => boolean;
    hasKeyword: (p: string, k: string) => boolean;
    vortexCanAttackPlayers: (p: string) => boolean;
  } {
    const ks = new Set((opts.keywords ?? []).map(([p, k]) => `${p}|${k}`));
    const vp = new Set(opts.vortexCanAttackPlayers ?? []);
    return {
      hasRestriction: () => false,
      hasKeyword: (p, k) => ks.has(`${p}|${k}`),
      vortexCanAttackPlayers: (p) => vp.has(p),
    };
  }

  it("a NON-Vortex attack is unaffected: a player target stays unconditionally legal", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A); // no ＜Vortex＞
    state.players[0]?.battleArea.push(attacker);
    // No isVortex flag => the normal attack path; player target legal (existing behavior).
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, reader({}) as never)).toBeNull();
  });

  it("a ＜Vortex＞ attack (printed keyword) against a player is ILLEGAL by default (Digimon-only)", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, VORTEX_DIGIMON); // printed ＜Vortex＞
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, reader({}) as never, true)).toBe("illegal-target");
  });

  it("a ＜Vortex＞ attack against an opponent's SUSPENDED Digimon is legal (base target)", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, VORTEX_DIGIMON);
    const defender = digimonPermanent(1, DIGIMON_B, { suspended: true });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(defender);
    expect(
      canAttackTarget(
        access,
        0,
        attacker,
        { kind: "permanent", permanentId: defender.permanentId },
        reader({}) as never,
        true,
      ),
    ).toBeNull();
  });

  it("a ＜Vortex＞ attack against an opponent's UNSUSPENDED Digimon is legal (core ability, §16-33-1)", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, VORTEX_DIGIMON);
    const defender = digimonPermanent(1, DIGIMON_B, { suspended: false });
    state.players[0]?.battleArea.push(attacker);
    state.players[1]?.battleArea.push(defender);
    expect(
      canAttackTarget(
        access,
        0,
        attacker,
        { kind: "permanent", permanentId: defender.permanentId },
        reader({}) as never,
        true,
      ),
    ).toBeNull();
    // Without isVortex, the same unsuspended target stays illegal (base rule unaffected).
    expect(
      canAttackTarget(
        access,
        0,
        attacker,
        { kind: "permanent", permanentId: defender.permanentId },
        reader({}) as never,
      ),
    ).toBe("illegal-target");
  });

  it("a VortexCanAttackPlayers GRANT relaxes the base rule: the player attack becomes legal", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, VORTEX_DIGIMON);
    state.players[0]?.battleArea.push(attacker);
    const r = reader({ vortexCanAttackPlayers: [attacker.permanentId] });
    expect(canAttackTarget(access, 0, attacker, { kind: "player" }, r as never, true)).toBeNull();
  });

  it("a ＜Vortex＞ declaration from a Digimon WITHOUT ＜Vortex＞ is illegal (keyword required)", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A); // no ＜Vortex＞ printed or granted
    state.players[0]?.battleArea.push(attacker);
    expect(canAttackerDeclare(access, 0, attacker, reader({}) as never, true)).toBe("illegal-target");
    // The same Digimon attacking normally (no isVortex) is fine.
    expect(canAttackerDeclare(access, 0, attacker, reader({}) as never)).toBeNull();
  });

  it("a GRANTED ＜Vortex＞ keyword satisfies the declaration requirement", () => {
    const { state, access } = makeState();
    const attacker = digimonPermanent(0, DIGIMON_A); // no printed ＜Vortex＞
    state.players[0]?.battleArea.push(attacker);
    const r = reader({ keywords: [[attacker.permanentId, "Vortex"]] });
    expect(canAttackerDeclare(access, 0, attacker, r as never, true)).toBeNull();
  });
});
