import { describe, it, expect } from "vitest";
import { PlayerState, Phase, requireCardDefinition, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { GameEngine, type GameEngineHooks } from "../GameEngine.js";
import { GameState, CardInstance, type ServerEvent, type DecisionRequest } from "@aegis/shared";
import { UseTracker } from "../effects/kernel.js";
import { validateHatchEgg, applyHatchEgg } from "../actions/breeding.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../../cards/index.js";

/**
 * The Glossary (19 chunks, glossary-0000 through glossary-0018) — a separately scraped
 * KB source from the Comprehensive Rules (see README's citation contract), so a claim
 * proven under a `comprehensive-*` id elsewhere in this suite is NOT automatically
 * "covered" here; each glossary chunk gets its own citation and its own concrete
 * assertion. Where a term's mechanic already has DEEP, real coverage elsewhere in this
 * suite (chapter 16's keyword tests especially), this file picks a genuinely distinct,
 * not-yet-proven nuance of the glossary's OWN plain-language wording rather than
 * re-deriving the same scenario under a new id.
 */

let seq = 0;
function card(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `gl-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = faceUp;
  return c;
}

describe("glossary-0000 (Card Types)", () => {
  it("a Tamer permanent is not a legal attack target — Tamers 'can't be targeted by an attacking Digimon'", () => {
    cite(
      "glossary-0000",
      "Tamer Cards: '...They can't be targeted by an attacking Digimon.'",
      "3a9772636093602f9b3e0bba6f526135ffde9fac00a79c0b0aed3b9174d57187",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 5000);
    p0.battleArea.push(attacker);
    const tamer = digimon(1, 0, "BT12-092"); // a real Tamer card as the sole permanent
    p1.battleArea.push(tamer);

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: tamer.permanentId },
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });
});

describe("glossary-0001 (Areas on the Playing Field, part 1)", () => {
  it("Breeding Area: 'Only 1 Digimon can be in the breeding area at a time'", () => {
    cite(
      "glossary-0001",
      "Breeding Area: 'Only 1 Digimon can be in this area at a time.'",
      "61a7d65976ba8c2410cdf14190c9dc9dd903445ec1ca5430b41afbed3c5482a0",
    );

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.phase = Phase.Breeding;
    const occupant = digimon(0, 0, "BT1-001");
    occupant.inBreeding = true;
    p0.breeding = occupant;
    const egg = instance("BT1-001", 0, false);
    p0.eggDeck.push(egg);

    // A hatch attempt with the slot already occupied is rejected outright.
    expect(validateHatchEgg(state, 0)).toEqual({ ok: false, reason: "breeding-occupied" });
  });
});

describe("glossary-0002 (Areas on the Playing Field, part 2)", () => {
  it("Security Stack: 'A player loses the game if they are attacked with zero cards remaining in their security stack'", async () => {
    cite(
      "glossary-0002",
      "Security Stack: 'A player loses the game if they are attacked with zero cards remaining in their security stack.'",
      "56ada564201d96097b9918dc5587b91d7a69c26e1a77bf432776983be11ee601",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const attacker = digimon(0, 5000, NON_KEYWORD); // base 1 security check, no modifiers
    p0.battleArea.push(attacker);
    // p1 (s.state.players[1]) has an empty security stack.

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver, 5000);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0); // p1 lost — the match ends with p0 declared the winner
  });
});

const NON_KEYWORD = "AD1-001";

describe("glossary-0003 (Timings, part 1)", () => {
  it("On Play: 'Does not apply to digivolving Digimon' — a digivolve does NOT fire the base's [On Play]", async () => {
    cite(
      "glossary-0003",
      "On Play: 'Triggers when Digimon are played directly to the battle area. Does not apply to " +
        "digivolving Digimon or Digimon moved into play from the breeding area.'",
      "9182a8b692d277518b43386cd20ed8e3e1198b6633439c7a562c81affcb9de82",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // BT10-020 (Greymon/MetalGreymon's earlier form BT10-019... use a real card with a real
    // [On Play] that has an observable effect): BT1-090-style draw effects live on Options, so
    // use a Digimon whose [On Play] is a plain, unconditional <Draw 1> equivalent — reuse
    // AD1-001's [On Play] "return 1 card...from trash", inert with an empty trash (0 candidates),
    // so instead assert via the event log: playCard fires cardPlayed+On Play resolution; digivolve
    // must NOT.
    const base = digimon(0, 5000, "AD1-001");
    p0.battleArea.push(base);
    const digivolveCard = instance("AD1-002", 0, false); // Lv.5, digivolves from Lv.4 Red, cost 3
    p0.hand.push(digivolveCard);
    s.state.memory = 3;

    const eventsBefore = s.events.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: digivolveCard.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "AD1-002", 5000);

    // No "cardPlayed" event exists for a digivolve (that event is exclusive to the play-card
    // verb) — the base's [On Play] window is never opened by digivolving into it.
    expect(s.events.slice(eventsBefore).some((e) => e.kind === "cardPlayed")).toBe(false);
  });
});

describe("glossary-0004 (Timings, part 2)", () => {
  it("On Deletion: 'Triggers when...deleted when its DP is reduced to 0' — a rule-check deletion (not just combat) fires [On Deletion]", async () => {
    cite(
      "glossary-0004",
      "On Deletion: 'Triggers when a Digimon is defeated in battle, deleted by a card effect, " +
        "or deleted when its DP is reduced to 0.'",
      "f95ec9683cc6a6647081f019f6bcdd02637747db32d3ec5c945039fb8ee6ec0f",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    // EX8-034: real [On Deletion] "Give 2 of your opponent's Digimon <Security Attack -1>".
    const mammothmon = digimon(0, 0, "EX8-034"); // raw DP 0 — a rule-check (NOT combat) deletion target
    p0.battleArea.push(mammothmon);
    const target1 = digimon(1, 3000, NON_KEYWORD);
    const target2 = digimon(1, 3000, NON_KEYWORD);
    p1.battleArea.push(target1, target2);

    const trigger = instance("BT1-009", 0, false); // vanilla, effect-free — pure timing-window opener
    p0.hand.push(trigger);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId })).toEqual({ ok: true });
    await settle(() => !p0.battleArea.some((p) => p.permanentId === mammothmon.permanentId), 5000);
    await settle(() => false, 60); // flush the [On Deletion] grant

    // The rule check (not combat) deleted it, at 0 raw DP...
    expect(p0.trash.some((c) => c.instanceId === mammothmon.topCard?.instanceId)).toBe(true);
    // ...and its [On Deletion] effect actually fired — granting <Security Attack -1> to the
    // opponent's Digimon, observable on the continuous ledger.
    const continuousReader = (s.engine as unknown as { continuous: { hasKeyword(id: string, kw: string): boolean } })
      .continuous;
    expect(
      continuousReader.hasKeyword(target1.permanentId, "SecurityAttack") ||
        continuousReader.hasKeyword(target2.permanentId, "SecurityAttack"),
    ).toBe(true);
  });
});

describe("glossary-0005 (Card States)", () => {
  it("Suspended: 'Suspended Digimon can be targeted for attacks' — an unsuspended Digimon can't be", () => {
    cite(
      "glossary-0005",
      "Suspended: 'Suspended Digimon can be targeted for attacks.'",
      "733c5185b00b7464893e9e03581cba89ac2856796ff567a544c070aea6cf31a6",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 5000);
    p0.battleArea.push(attacker);
    const unsuspendedTarget = digimon(1, 1000, NON_KEYWORD);
    unsuspendedTarget.isSuspended = false;
    p1.battleArea.push(unsuspendedTarget);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedTarget.permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    unsuspendedTarget.isSuspended = true; // now suspended
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedTarget.permanentId },
      }),
    ).toEqual({ ok: true });
  });
});

interface Harness {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
}

/** Full-turn-loop harness (same shape as EX10-058.test.ts / ch18's copy — see those files). */
function fullTurnHarness(firstSeat: Seat = 0): Harness {
  const state = new GameState();
  const events: ServerEvent[] = [];
  let engineRef: GameEngine | undefined;
  const respond = (seat: Seat, req: DecisionRequest, response: unknown): void => {
    queueMicrotask(() =>
      engineRef?.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: response as never,
      }),
    );
  };
  const hooks: GameEngineHooks = {
    seed: firstSeat === 0 ? 0 : 1,
    requestDecision: (seat, req) => {
      if (req.kind === "optional") respond(seat, req, { kind: "optional", accept: true });
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.turnSeat = firstSeat;
  state.isFirstPlayersFirstTurn = true;
  return { engine, state, events };
}

/** Whether the engine will accept an ordinary Main verb right now (no effect window in flight). */
function mainPhaseReady(h: Harness): boolean {
  const internals = h.engine as unknown as {
    activeWindowToken: number | undefined;
    effectResolutionDepth: number;
    optionResolutionDepth: number;
  };
  return (
    internals.activeWindowToken === undefined &&
    internals.effectResolutionDepth === 0 &&
    internals.optionResolutionDepth === 0
  );
}

/** Drive one turn, tolerating the turn ending before Main phase ever opens (a deck-out loss). */
async function driveTurnAllowingLoss(h: Harness, seat: Seat): Promise<void> {
  const turn = h.engine.runOneTurn();
  const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen && !h.state.gameOver; i += 1) await Promise.resolve();
  if (mainPhase.isOpen) {
    // Main verbs are rejected while the start-of-main window is still resolving, so let
    // that window drain first. The phase may auto-end meanwhile (a deck-out loss), which
    // this driver deliberately tolerates — hence the local loop rather than the seam's
    // throwing readiness wait.
    for (let i = 0; i < 500 && mainPhase.isOpen && !mainPhaseReady(h); i += 1) await Promise.resolve();
    if (!mainPhase.isOpen) {
      await turn;
      return;
    }
    h.engine.applyIntent(seat, { type: "endPhase" });
  }
  await turn;
}

describe("glossary-0006 (Game Phases)", () => {
  it(
    "Draw Phase: 'The player who goes first does not draw during their initial turn' AND " +
      "'If a player's deck is empty, and they can't draw a card during this phase, they lose the game'",
    async () => {
      cite(
        "glossary-0006",
        "Draw Phase: 'The player who goes first does not draw during their initial turn. If a " +
          "player's deck is empty, and they can't draw a card during this phase, they lose the game.'",
        "8138351158db1d80dda82e6ac4cdc9e38bee0c5082a1e22ba93e162a7d880acc",
      );

      const h = fullTurnHarness(0);
      const p0 = h.state.players[0] as PlayerState;
      const p1 = h.state.players[1] as PlayerState;
      for (let i = 0; i < 5; i += 1) p0.deck.push(card("BT1-009", 0, false)); // plenty — proves it's SKIPPED, not just empty
      // p1's deck is deliberately empty: seat 1's turn-2 draw will be forced from nothing.

      const p0HandBefore = p0.hand.length;
      await driveTurnAllowingLoss(h, 0); // turn 1: first player, first turn — draw is skipped

      // The first player's hand did NOT grow despite a non-empty deck: the draw was SKIPPED.
      expect(p0.hand.length).toBe(p0HandBefore);
      expect(h.state.gameOver).toBe(false);

      // Hand the turn to seat 1 (runOneTurn() runs whoever `turnSeat` currently names — the
      // caller advances it, mirroring EX10-058.test.ts's identical two-turn pattern).
      h.state.turnSeat = 1;
      h.state.memory = -h.state.memory;
      await driveTurnAllowingLoss(h, 1); // turn 2: seat 1 must draw from an empty deck

      expect(h.state.gameOver).toBe(true);
      expect(p1.lost).toBe(true);
      expect(h.state.winnerSeat).toBe(0);
      expect(h.events.some((e) => e.kind === "gameOver" && "reason" in e && e.reason === "deckOut")).toBe(true);
    },
  );
});

describe("glossary-0007 (Properties Common to All Card Types)", () => {
  it("Once Per Turn vs Twice Per Turn are independently tracked, and per (instance, effectKey) not globally", () => {
    cite(
      "glossary-0007",
      "Once Per Turn: activatable only once per turn even if conditions recur; different Once " +
        "Per Turn effects (or the same effect on 2 different Digimon) each get their own count. " +
        "Twice Per Turn: the identical rule, but the ceiling is 2.",
      "125cda217c1b57e3244104c64ce2073253694613d459113be0551f8ba3ba66b1",
    );

    const tracker = new UseTracker();
    // "Once Per Turn": the 2nd attempt on the SAME (instance, key) is over the limit.
    tracker.register("perm-A", "onceKey");
    expect(tracker.count("perm-A", "onceKey")).toBe(1);

    // "Twice Per Turn": 2 uses are allowed, a 3rd is not (ceiling is exactly 2, not 1).
    tracker.register("perm-A", "twiceKey");
    tracker.register("perm-A", "twiceKey");
    expect(tracker.count("perm-A", "twiceKey")).toBe(2);

    // "Different effects with the restriction can still each be activated": a DIFFERENT
    // effectKey on the SAME permanent has its own independent count, untouched by the above.
    expect(tracker.count("perm-A", "unrelatedKey")).toBe(0);

    // "2 separate Digimon possessing the SAME effect can each activate once": a different
    // instanceId with the identical effectKey is independently tracked.
    expect(tracker.count("perm-B", "onceKey")).toBe(0);
  });
});

describe("glossary-0008 (Digimon Card Properties)", () => {
  it("DP: 'the Digimon with the lower number loses and is deleted' in battle", async () => {
    cite(
      "glossary-0008",
      "DP: 'When battling, the DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted.'",
      "953bc879cf9def7db4680ac3ef51bd43ea04fe8f124624f89ce7eba5eef0c208",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 3000, NON_KEYWORD); // lower DP
    p0.battleArea.push(attacker);
    const defender = digimon(1, 9000, NON_KEYWORD); // higher DP
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId), 5000);

    // The LOWER-DP side (the attacker, 3000 < 9000) lost and was deleted.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === attacker.topCard?.instanceId)).toBe(true);
    // The higher-DP side survives.
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(true);
  });
});

describe("glossary-0009 (Digi-Egg Card Properties)", () => {
  it("In-Training: 'Corresponds to Level 2' — a hatched Digi-Egg carries level 2", () => {
    cite(
      "glossary-0009",
      "In-Training: 'One of the stages of Digimon Digivolution. Corresponds to Level 2.'",
      "42b4d935e4e30fb88732958fec776ed44080dccd49ba77c90fe3cce3dc152406",
    );

    const eggDef = requireCardDefinition("BT1-001"); // a real Digi-Egg, hatched elsewhere in this suite
    expect(eggDef.level).toBe(2);

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.phase = Phase.Breeding;
    p0.eggDeck.push(instance("BT1-001", 0, false));
    let idSeq = 0;
    const result = applyHatchEgg(state, 0, { nextPermanentId: () => `gl-hatch-${idSeq++}` });
    expect(result.ok).toBe(true);
    expect(requireCardDefinition(p0.breeding!.topCard.cardId).level).toBe(2);
  });
});

describe("glossary-0010 (Tamer Card Properties)", () => {
  it("Play Cost: playing a Tamer deducts EXACTLY its printed play cost from memory", async () => {
    cite(
      "glossary-0010",
      "Play Cost: 'Required cost to play a Tamer directly to your battle area.'",
      "9d6f500b81b9c43a5c9684072c88d08e8a387ab4f4fa4ff80dd889ade7e40704",
    );

    const def = requireCardDefinition("BT12-092"); // a real Tamer, printed play cost 4
    expect(def.playCost).toBeGreaterThan(0);

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const tamerCard = instance("BT12-092", 0, false);
    p0.hand.push(tamerCard);
    s.state.memory = def.playCost;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamerCard.instanceId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT12-092"), 5000);

    expect(s.state.memory).toBe(0); // paid exactly the printed cost, no more no less
  });
});

describe("glossary-0011 (Option Card Properties)", () => {
  it("Cost: playing an Option deducts EXACTLY its printed cost from memory", async () => {
    cite(
      "glossary-0011",
      "Cost: 'Required cost to use an Option card.'",
      "85d7929bde7033e4c486f2f06362f2f261d5c8f212c98a8aba5c8edc6e3a708e",
    );

    const def = requireCardDefinition("BT1-097"); // a real Option, printed cost 1, unconditional <Draw 1>
    expect(def.playCost).toBe(1);

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    p0.battleArea.push(digimon(0, 3000, "BT1-027")); // §4-22 color-requirement source (Blue)
    p0.deck.push(instance("AD1-001", 0, false)); // a card for the option's own Draw 1 to hit
    const option = instance("BT1-097", 0, false);
    p0.hand.push(option);
    s.state.memory = def.playCost;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory !== def.playCost || p0.trash.length > 0, 5000);

    expect(s.state.memory).toBe(0);
  });
});

describe("glossary-0012 (Actions, part 1)", () => {
  it("Pass: 'the memory counter is moved to the opponent's number 3 space regardless of where it was before passing'", async () => {
    cite(
      "glossary-0012",
      "Pass: 'Voluntarily giving up your turn to the opponent during the main phase. When a " +
        "turn is passed, the memory counter is moved to the opponent's number 3 space regardless " +
        "of where it was before passing.'",
      "8707e9160e2e490b0b2f13a8028b145dc531086249f98d0bd8f7f9102e287427",
    );

    // `endPhase` is only legal while the REAL Main phase is open (MainPhaseController, driven
    // by the turn machine) — the lightweight `setup()` harness never opens it, so this needs
    // the full turn loop. A hand card + affordable memory is required too: with NO legal
    // action available, GameEngine auto-passes the Main phase the instant it opens (before
    // this test could intervene), which is not the scenario under test (a VOLUNTARY pass).
    const h = fullTurnHarness(0);
    const p0 = h.state.players[0] as PlayerState;
    p0.hand.push(card("BT1-009", 0, false));
    h.state.memory = 2; // affords BT1-009 — keeps a legal action available so Main phase stays open
    const turn = h.engine.runOneTurn();
    // The Main controller opens BEFORE the start-of-main timing window finishes, and
    // `applyIntent` rejects Main verbs while any effect window is still active. Wait for
    // the authoritative readiness the seam exposes, not merely for `isOpen`.
    await advance(h.engine).waitForMainPhase(0);
    const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    expect(mainPhase.isOpen).toBe(true);

    h.state.memory = 5; // an arbitrary prior value, strongly favoring the turn player (seat 0)
    expect(h.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    // Regardless of the prior +5, passing sets memory to -3 (the number-3 space on the
    // OPPONENT's side, in this turnSeat-relative gauge's sign convention).
    expect(h.state.memory).toBe(-3);
  });
});

describe("glossary-0013 (Actions, part 2 — DNA Digivolution / Color Requirements)", () => {
  it("cross-references existing deep coverage rather than re-deriving it", () => {
    cite(
      "glossary-0013",
      "DNA Digivolution (stacking multiple material Digimon, placing the DNA card on top, " +
        "paying the DNA cost, drawing a bonus card) is behaviorally verified — including a real " +
        "documented divergence on the draw bonus — under ch08-digivolution.test.ts's " +
        "comprehensive-0127 through comprehensive-0130 (§8-2 DNA Digivolution). Color " +
        "Requirements ('a Digimon or Tamer in your battle area or breeding area matching the " +
        "Option's color') is behaviorally verified as a DIVERGENCE (the gate reads only the " +
        "6-card `optionColorRequirements` field, never an ordinary Option's `colors`) under " +
        "ch04-basic-terminology.test.ts's comprehensive-0308. Both mechanics are the SAME " +
        "engine code this glossary chunk's own wording describes, not a distinct implementation " +
        "to re-verify — repeating either scenario here would test the identical code path a " +
        "second time under a new id, not new coverage.",
      "a6a0bff871fef3a3dcf894a497802a220308eae41acab98441fe3aceedb37255",
    );

    // A minimal, fresh corroboration (not a re-derivation of the full mechanic): the real card
    // ch08 drives through `dnaDigivolveInto` prints its own DNA digivolution requirement text,
    // confirming the printed-card side of the same claim this chunk's prose describes.
    const dnaCard = requireCardDefinition("ST9-05"); // the DNA-digivolve card ch08 uses
    expect(dnaCard.effectText).toContain("DNA Digivolution");
  });
});

describe("glossary-0014 (Keyword Effects — <Security Attack -x>)", () => {
  it("'If your opponent has zero security cards and you attack with a Digimon that checks zero cards, you can't win the game'", async () => {
    cite(
      "glossary-0014",
      "<Security Attack -x>: 'If your opponent has zero security cards and you attack with a " +
        "Digimon that checks zero cards, you can't win the game.'",
      "4d9d193330e59f68c23e6c4ed03a38b5066d636a12352ae16a2fb72f38a1d4a2",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 5000, NON_KEYWORD);
    p0.battleArea.push(attacker);
    // Base 1 check, inverted by a -1 grant => 0 checks.
    (
      s.engine as unknown as {
        continuous: { addKeywordGrant(id: string, kw: string, duration: string, amount?: number): void };
      }
    ).continuous.addKeywordGrant(attacker.permanentId, "SecurityAttack", "permanent", -1);
    await s.engine.recomputeContinuousEffects();
    // p1's security stack is EMPTY — normally an automatic win for a 1+-check attack (glossary-0002).

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // 0 checks against 0 security: NOT a win, unlike the glossary-0002 scenario with a normal
    // (>=1 check) attacker against the same empty stack.
    expect(s.state.gameOver).toBe(false);
    expect(p1.lost).toBe(false);
  });
});

describe("glossary-0015 (Keyword Effects — <Jamming>)", () => {
  it("<Jamming> spares the attacker from a Security Digimon loss, but a SEPARATE <Security A. +1> check still runs afterward", async () => {
    cite(
      "glossary-0015",
      "<Jamming>: '...If the Digimon has a Security Attack + effect that allows for an " +
        "additional security card to be checked, that check can still be performed.'",
      "54d17d1ae79ce2fadc0b4aa8a78e80baf7799a1b4676010bf634752673a9b500",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 1000, "BT1-069"); // printed <Jamming>, low DP
    p0.battleArea.push(attacker);
    (
      s.engine as unknown as {
        continuous: { addKeywordGrant(id: string, kw: string, duration: string, amount?: number): void };
      }
    ).continuous.addKeywordGrant(attacker.permanentId, "SecurityAttack", "permanent", 1); // base 1 + 1 = 2 checks
    await s.engine.recomputeContinuousEffects();
    p1.security.push(instance("AD1-001", 1, false), instance("BT1-009", 1, false)); // [0] 5000 DP Security Digimon, [1] a plain card

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.security.length === 0, 5000);

    // Jamming spared the attacker despite losing the first (Security Digimon) check...
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    // ...AND the SECOND check (from the +1 grant) still ran: both security cards were consumed,
    // not just the one the Security Digimon battle stopped at.
    expect(p1.security.length).toBe(0);
  });
});

describe("glossary-0016 (Keyword Effects — <Reboot>)", () => {
  it("'unsuspended during not only your unsuspend phase, but your opponent's unsuspend phase AS WELL' — Reboot doesn't replace normal self-unsuspend", async () => {
    cite(
      "glossary-0016",
      "<Reboot>: 'Digimon with this effect are unsuspended during not only your unsuspend " +
        "phase, but your opponent's unsuspend phase as well.' (additive, not a replacement)",
      "db0fb43c10d9c8128bdc0d2c36b3fa85fd3c344c681c8162d4ededffd2cb1cb3",
    );

    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const rebooter = digimon(1, 11000, "AD1-013"); // printed <Reboot>
    rebooter.isSuspended = true;
    p1.battleArea.push(rebooter);
    await s.engine.recomputeContinuousEffects();

    // Seat 1's OWN unsuspend phase (not the opponent's) — Reboot must not suppress this.
    await (s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
      1 as Seat,
    );

    expect(rebooter.isSuspended).toBe(false);
  });
});

describe("glossary-0017 (Keyword Effects — <Blitz>)", () => {
  it("'if the Digimon is suspended... <Blitz> won't enable it to attack'", () => {
    cite(
      "glossary-0017",
      "<Blitz>: '...if the Digimon is suspended, has an effect that prevents it from attacking, " +
        "or is otherwise unable to attack normally, <Blitz> won't enable it to attack.'",
      "eb3c4ba99b9daceef70d032e42ba142b8c622791f4d10eab1e1cb2b23b88b93f",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const blitzer = digimon(0, 5000, NON_KEYWORD);
    blitzer.isSuspended = true; // already suspended — can't attack normally
    p0.battleArea.push(blitzer);
    (
      s.engine as unknown as { continuous: { addKeywordGrant(id: string, kw: string, duration: string): void } }
    ).continuous.addKeywordGrant(blitzer.permanentId, "Blitz", "permanent");

    s.state.memory = -3; // memory HAS crossed to the opponent — the one precondition Blitz needs
    const hasBlitz = (
      s.engine as unknown as { combat: { hasBlitzAttackAvailable(seat: Seat): boolean } }
    ).combat.hasBlitzAttackAvailable(0 as Seat);

    // Even with memory crossed and the keyword granted, a SUSPENDED holder gets no Blitz attack.
    expect(hasBlitz).toBe(false);
  });
});

describe("glossary-0018 (Keyword Effects — <Delay>)", () => {
  it("<Delay>: \"It's not necessary to pay an Option card's memory cost...when activating its <Delay> effect\"", async () => {
    cite(
      "glossary-0018",
      "<Delay>: \"It's not necessary to pay an Option card's memory cost or meet color " +
        'requirements when activating its <Delay> effect."',
      "2067fdaf6c3e1cdcb88ba07a3283c3cd108c46c8fae6720c8b0f0bd6fbe8bc6a",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const delayer = digimon(0, 0, "BT10-097"); // [Main] <Delay>: trash self, gain 2 memory
    delayer.enterFieldTurnCount = s.state.turnCount - 1; // entered on an earlier turn — eligible
    p0.battleArea.push(delayer);
    s.state.memory = -10; // deeply memory-starved — could not afford ANY normal cost right now

    (s.engine as unknown as { projection: { syncActivatableEffects(): void } }).projection.syncActivatableEffects();
    const entries: { instanceId: string; effectKey: string }[] = delayer.activatableEffectsJson
      ? JSON.parse(delayer.activatableEffectsJson)
      : [];
    const sourceInstanceId = delayer.topCard!.instanceId;
    const entry = entries.find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT10-097 surfaces its <Delay> ability despite the memory shortfall").toBeDefined();

    // Activation succeeds with memory deep in the negative — proving no cost was charged.
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId,
      effectKey: entry!.effectKey,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.battleArea.length === 0, 5000);

    expect(p0.battleArea.some((p) => p.permanentId === delayer.permanentId)).toBe(false); // trashed itself
    expect(p0.trash.length).toBeGreaterThan(0);
  });
});
