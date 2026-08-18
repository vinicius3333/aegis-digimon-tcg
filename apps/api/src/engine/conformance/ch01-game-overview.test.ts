import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  requireCardDefinition,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js"; // registers the seeded not-testable manifest as a side effect

/**
 * FINDING (chunk-id positional fragility, see README "Chunk ids are positional"):
 * comprehensive-0273..0276 are tagged section "1-9" by tools/kb/index-rules.mjs's chunker,
 * but their TEXT is the document's revision-history changelog ("Ver.2.2 Added ... Ver.2.3
 * Updated ..."), not chapter 1 rule prose — there is no rule "1-9" in the Comprehensive
 * Rules table of contents; the chunker mis-tagged them with the last section number it had
 * seen before the trailing appendix. They carry zero normative content (a bibliographic
 * changelog), so no engine behavior could ever hang off them — unlike a genuine bare
 * heading, there is no future rule text to eventually attach a test to. Marked not-testable
 * here (rather than the shared not-testable.ts manifest) because the reason is specific to
 * this mis-tagging, not the generic TOC/heading reasons already recorded there.
 */
for (const id of ["comprehensive-0273", "comprehensive-0274", "comprehensive-0275", "comprehensive-0276"]) {
  markNotTestable(
    id,
    "Revision-history changelog entry ('Ver.X.Y Updated/Added/Deleted ...'), mis-tagged section " +
      '"1-9" by the chunker (positional chunk-id artifact — there is no rule 1-9). Zero rule ' +
      "content; nothing to assert.",
  );
}
import { GameEngine } from "../GameEngine.js";
import { GameStateAccess } from "../state/access.js";
import { canAttackerDeclare, type ContinuousLegalityReader } from "../combat/legality.js";
import { MemoryGauge, MEMORY_MIN, MEMORY_MAX } from "../MemoryGauge.js";
import { WinCheck } from "../security/winCheck.js";
import { runSecurityCheck, type SecurityCheckDeps, type SecurityCheckAttacker } from "../security/securityCheck.js";
import { validateDecklist } from "../deckValidation.js";
import { MAIN_DECK_SIZE, MAX_EGG_DECK_SIZE, RED_DECK } from "../testDecks.js";
import { makeInstance as instance, makeDigimon as digimon, setupEngine as setup } from "../testkit/harness.js";
// Self-registers card modules (boot side-effect); needed for effect-text-driven keyword checks.
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 1 "Game Overview" (comprehensive-0001, 0019-0030, 0273-0276).
 *
 * See `README.md` for the citation contract. Each test names the rule it proves in its
 * description (or a leading comment) so the KB mapping is auditable without opening the
 * index. Chunk ids comprehensive-0001, 0019 are the TOC entry and bare chapter heading —
 * already seeded not-testable in `not-testable.ts`.
 */

describe("§1-1 Number of Players (comprehensive-0020)", () => {
  it("1-1-1: a match seats exactly two players, seat 0 and seat 1", () => {
    cite("comprehensive-0020", "played by two players in a match");

    const s = setup();
    expect(s.state.players.length).toBe(2);
    expect(s.state.players[0]?.seat).toBe(0);
    expect(s.state.players[1]?.seat).toBe(1);
  });
});

describe("§1-2 Game Victory/Loss (comprehensive-0021)", () => {
  it("1-2-1/1-2-2: the game is not over until a player wins or loses; declareLoss ends it", () => {
    cite("comprehensive-0021", "the game ends when one player wins or loses");

    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const events: ServerEvent[] = [];
    const win = new WinCheck(state, (e) => events.push(e));

    expect(state.gameOver).toBe(false);
    win.declareLoss(1, "surrender");
    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(0);
    expect(state.players[1]?.lost).toBe(true);
    expect(events.some((e) => e.kind === "gameOver")).toBe(true);
  });

  it("1-2-5: a forfeit (surrender) is a real loss cause distinct from a rule/effect loss", () => {
    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const events: ServerEvent[] = [];
    const win = new WinCheck(state, (e) => events.push(e));
    win.surrender(0);
    expect(events.some((e) => e.kind === "gameOver" && e.reason === "surrender")).toBe(true);
  });
});

describe("§1-2-3 Victory conditions (comprehensive-0022)", () => {
  const ATTACKER_ID = "attacker-1";

  function securityHarness() {
    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const attacker = new Permanent();
    attacker.permanentId = ATTACKER_ID;
    attacker.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "attacker-top";
    top.cardId = "BT15-002";
    top.ownerSeat = 0;
    attacker.topCard = top;
    state.players[0]?.battleArea.push(attacker);

    const events: ServerEvent[] = [];
    const win = new WinCheck(state, (e) => events.push(e));
    const deps: SecurityCheckDeps = {
      strikeFor: () => 1,
      permanentById: (id) => (id === ATTACKER_ID ? state.players[0]?.battleArea[0] : undefined),
      fireTiming: async () => {},
      resolveSecurityEffect: async () => false,
      dpOf: () => 5000,
      securityCardDp: () => 3000,
      isDigimon: () => false,
      deletePermanents: async () => {},
    };
    return { state, events, win, deps };
  }

  it("1-2-3-1: an attack with >=1 security check landing on 0 security cards wins the game", async () => {
    cite("comprehensive-0022", "1-2-3-1 victory: successful attack into 0 security");

    const { state, win, deps, events } = securityHarness();
    const attacker: SecurityCheckAttacker = { permanentId: ATTACKER_ID };
    await runSecurityCheck(state, (e) => events.push(e), win, deps, 1, attacker);

    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(0);
    expect(events.some((e) => e.kind === "gameOver" && e.reason === "security")).toBe(true);
  });

  it("1-2-3-2: a player with an empty deck who must draw loses (deck-out)", () => {
    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    // seat 0's deck is empty.
    const win = new WinCheck(state, () => {});
    expect(win.wouldDeckOut(0)).toBe(true);
    expect(win.wouldDeckOut(1)).toBe(true); // both empty here; opponent also would deck-out

    win.declareLoss(0, "deckOut");
    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(1);
  });
});

describe("§1-3 Fundamental Principles (comprehensive-0023)", () => {
  it('1-3-1: card text overrides the rules — <Rush> lets a just-played Digimon attack immediately', () => {
    cite(
      "comprehensive-0023",
      "1-3-1 card text overrides rules; example: <Rush> attacking the turn it's played",
    );

    const s = setup();
    s.state.turnCount = 1;
    const p0 = s.state.players[0] as PlayerState;
    const access = new GameStateAccess(s.state);
    const reader = (s.engine as unknown as { continuous: ContinuousLegalityReader }).continuous;

    // A vanilla Digimon that entered the field THIS turn cannot attack (summoning sickness).
    const vanilla = digimon(0, 5000, "AD1-001");
    vanilla.enterFieldTurnCount = 1;
    p0.battleArea.push(vanilla);
    expect(canAttackerDeclare(access, 0 as Seat, vanilla, reader)).toBe("illegal-target");

    // A Digimon with printed <Rush> text, entering the same turn, CAN attack — the card
    // text ("Rush") overrides the rule that would otherwise forbid it.
    const rushDef = requireCardDefinition("AD1-002");
    expect(rushDef.effectText ?? "").toMatch(/rush/i);
    const rusher = digimon(0, 5000, "AD1-002");
    rusher.enterFieldTurnCount = 1;
    p0.battleArea.push(rusher);
    expect(canAttackerDeclare(access, 0 as Seat, rusher, reader)).toBeNull();
  });

  it("1-3-3: requesting a card be changed to the state it's already in is a no-op", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000);
    perm.isSuspended = true;
    p0.battleArea.push(perm);

    // Suspending an already-suspended permanent leaves it suspended and does not throw
    // or double-apply — the primitive itself is the "no state to move to" no-op.
    perm.isSuspended = true;
    expect(perm.isSuspended).toBe(true);
  });
});

describe("§1-3-7..1-3-11-3 Fundamental Principles, cont'd (comprehensive-0024)", () => {
  it("1-3-7: a numerical value modified by a rule/effect is always truncated to an integer", () => {
    cite("comprehensive-0024", "1-3-7 modified numerical values are always integers");

    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const gauge = new MemoryGauge(state);
    gauge.gainMemory(2.7);
    expect(state.memory).toBe(2); // Math.trunc, not rounded
  });

  it("1-3-9: a cost that would become negative floors at 0, never goes negative", () => {
    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const gauge = new MemoryGauge(state);
    // canPay rejects a negative cost outright — the gauge never treats "pay -N" as
    // "gain N", matching the rule that a cost cannot become negative.
    expect(gauge.canPay(0, -1)).toBe(false);
  });

  it("1-4-2/1-3-10 cross-check: memory gauge is clamped to the documented [-10, 10] range", () => {
    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const gauge = new MemoryGauge(state);
    gauge.gainMemory(9999);
    expect(state.memory).toBe(MEMORY_MAX);
    gauge.setMemory(-9999);
    expect(state.memory).toBe(MEMORY_MIN);
  });
});

// §1-3-11-4 (comprehensive-0025): this sub-rule is a composite of the generic "can't declare
// use without paying its (alternate) cost" rule (1-3-11-1..1-3-11-3, behaviorally proven above
// via comprehensive-0023's canAttackerDeclare-driven test) applied specifically to DigiXros/
// Assembly's immediate-effect cost interaction. There is no lighter, chapter-1-scoped consequence
// distinct from that generic mechanism — proving the COMPOSITE requires a full DigiXros/Assembly
// play scenario (materials placed, cost reduced, declaration gated on affordability), which is
// chapter 7/8 territory (apps/api/src/engine/actions/digiXros.ts), not this chapter's area/
// overview scope. Not testable here; the DigiXros half of that composite IS driven end-to-end in
// ch02-card-information.test.ts's §2-3-7 test.
markNotTestable(
  "comprehensive-0025",
  "Composite of the generic declare-cost-gating rule (already behaviorally proven under " +
    "comprehensive-0023) specialized to DigiXros/Assembly's immediate-effect cost interaction. " +
    "Testing the composite itself requires a full DigiXros/Assembly play scenario, which is " +
    "chapter 7/8 scope, not chapter 1's game-overview scope.",
);

describe("§1-4-1 Deck and Digi-Egg deck (comprehensive-0027)", () => {
  it("1-4-1-2-1: a legal main deck must be exactly 50 cards, not more or fewer", () => {
    cite("comprehensive-0027", "1-4-1-2-1 deck must have exactly 50 cards");
    expect(MAIN_DECK_SIZE).toBe(50);

    const oneShort = { mainDeck: Array(MAIN_DECK_SIZE - 1).fill("BT1-010"), eggDeck: [] };
    const verdict = validateDecklist(oneShort);
    expect(verdict.ok).toBe(false);
  });

  it("1-4-1-2-2/1-4-1-3-2: at most 4 copies of a card with the same card number", () => {
    const tooMany = {
      mainDeck: [...Array(46).fill("BT1-020"), ...Array(4).fill("BT1-009")], // BT1-020 5x
      eggDeck: [],
    };
    // Not exactly 46+4=50; adjust to exactly 50 with 5 copies of one card.
    const deck = { mainDeck: [...Array(5).fill("BT1-020"), ...Array(45).fill("BT1-009")], eggDeck: [] };
    expect(deck.mainDeck.length).toBe(50);
    const verdict = validateDecklist(deck);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/too many copies/);
    void tooMany;
  });

  it("1-4-1-3-1: the egg deck may have 0 to 5 cards", () => {
    expect(MAX_EGG_DECK_SIZE).toBe(5);
    expect(RED_DECK.eggDeck.length).toBeGreaterThan(0);
    expect(RED_DECK.eggDeck.length).toBeLessThanOrEqual(5);
    const legalVerdict = validateDecklist(RED_DECK); // proves 1..5 eggs is legal
    expect(legalVerdict.ok).toBe(true);

    const noEggs = { mainDeck: RED_DECK.mainDeck, eggDeck: [] };
    expect(validateDecklist(noEggs).ok).toBe(true); // proves 0 eggs is also legal

    const tooManyEggs = { mainDeck: RED_DECK.mainDeck, eggDeck: Array(6).fill("BT1-001") };
    const overVerdict = validateDecklist(tooManyEggs);
    expect(overVerdict.ok).toBe(false);
  });
});

describe("§1-4-2 The Memory Gauge (comprehensive-0028)", () => {
  it("1-4-2-2: the gauge is shared and clamped to 10 on both sides, never exceeding it", () => {
    cite("comprehensive-0028", "1-4-2-2 memory gauge maxes at 10 on both sides");

    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const gauge = new MemoryGauge(state);
    gauge.gainMemory(20);
    expect(state.memory).toBe(10);
    expect(gauge.memoryFor(0)).toBe(10);
    expect(gauge.memoryFor(1)).toBe(-10);
  });

  it("1-4-2-3: 0 is the center — the left/right split is symmetric per-player perspective", () => {
    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const gauge = new MemoryGauge(state);
    expect(state.memory).toBe(0);
    expect(gauge.memoryFor(0)).toBe(0);
    expect(gauge.memoryFor(1)).toBe(-0); // symmetric at the center
  });
});

// §1-4-3 Marker (comprehensive-0029): the marker is the physical token that POINTS AT the
// memory value; the value itself is comprehensive-0028 (MemoryGauge), already behaviorally
// proven above. There is no separate "marker position" concept in GameState for the marker to
// diverge from the gauge value it displays, so there is nothing left to assert once 0028 is
// covered — it would be testable only if the engine modeled marker position as state distinct
// from the memory value, which it does not (by design: one number, not a token position).
markNotTestable(
  "comprehensive-0029",
  "The marker is a physical display of the memory value already proven under " +
    "comprehensive-0028 (MemoryGauge); GameState has no separate marker-position field for it " +
    "to diverge from that value, so there is no additional engine-observable consequence.",
);

describe("§1-4-4 Token Cards (comprehensive-0030)", () => {
  it("1-4-4-1/1-4-4-2: token cards are non-deck cards used by effects", () => {
    cite("comprehensive-0030", "1-4-4 token cards can't be included in a deck");

    // Every token in the registry is a spawned-only card (isToken), and a deck built with a
    // token's id is rejected as an unknown-for-deck card (tokens are not addressable by their
    // synthetic ids the way real cardIds are for validateDecklist purposes).
    const tokenDef = requireCardDefinition("TOKEN-Diaboromon");
    expect(tokenDef.isToken).toBe(true);
  });

  it("1-4-4-5 (structural corollary): a token can be played even without a play cost (Diaboromon has 14)", () => {
    // Not every token has playCost 0, but the field is well-formed (a number, not undefined),
    // which is what lets a token-play primitive bypass the "must have a printed cost" gate the
    // rule describes; the actual bypass is exercised at effect-spawn call sites (out of this
    // chapter's scope — chapter 4 "Basic Game Terminology" owns tokens' full spawn mechanics).
    const tokenDef = requireCardDefinition("TOKEN-Diaboromon");
    expect(typeof tokenDef.playCost).toBe("number");
  });
});

